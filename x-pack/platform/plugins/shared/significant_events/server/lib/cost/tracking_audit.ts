/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsClientContract, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

export const COST_TRACKING_AUDIT_SO_TYPE = 'significant-events-cost-tracking-audit';
export const COST_TRACKING_AUDIT_SO_ID = COST_TRACKING_AUDIT_SO_TYPE;
export const COST_TRACKING_AUDIT_MAX_EVENTS = 10_000;
const COST_TRACKING_AUDIT_MAX_SPACES = 10_000;
const MAX_OCC_ATTEMPTS = 100;
const MAX_ID_LENGTH = 1024;
const MAX_NAME_LENGTH = 1024;
const MAX_DATE_LENGTH = 64;
const MAX_ACTOR_LENGTH = 1024;

export interface CostTrackingAuditEvent {
  spaceId: string;
  enabled: boolean;
  changedAt: string;
  changedBy: string;
}

export interface CostTrackingKnownSpace {
  id: string;
  name: string;
}

export interface CostTrackingAuditAttributes extends Record<string, unknown> {
  events: CostTrackingAuditEvent[];
  knownSpaces: CostTrackingKnownSpace[];
}

export type CostTrackingAuditRepository = Pick<
  SavedObjectsClientContract,
  'create' | 'get' | 'update'
>;

const auditEventSchemaV1 = schema.object({
  spaceId: schema.string({ maxLength: MAX_ID_LENGTH }),
  enabled: schema.boolean(),
  changedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
  changedBy: schema.string({ maxLength: MAX_ACTOR_LENGTH }),
});

const knownSpaceSchemaV1 = schema.object({
  id: schema.string({ maxLength: MAX_ID_LENGTH }),
  name: schema.string({ maxLength: MAX_NAME_LENGTH }),
});

const auditAttributesSchemaV1 = schema.object({
  events: schema.arrayOf(auditEventSchemaV1, {
    maxSize: COST_TRACKING_AUDIT_MAX_EVENTS,
  }),
  knownSpaces: schema.arrayOf(knownSpaceSchemaV1, {
    maxSize: COST_TRACKING_AUDIT_MAX_SPACES,
  }),
});

export const getCostTrackingAuditSavedObjectType = (): SavedObjectsType => ({
  name: COST_TRACKING_AUDIT_SO_TYPE,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties: {},
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: auditAttributesSchemaV1.extends({}, { unknowns: 'ignore' }),
        create: auditAttributesSchemaV1.extends({}, { unknowns: 'allow' }),
      },
    },
  },
});

export const readCostTrackingAudit = async (
  repository: CostTrackingAuditRepository
): Promise<CostTrackingAuditAttributes | undefined> => {
  try {
    const savedObject = await repository.get<CostTrackingAuditAttributes>(
      COST_TRACKING_AUDIT_SO_TYPE,
      COST_TRACKING_AUDIT_SO_ID
    );
    return savedObject.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return undefined;
    }
    throw error;
  }
};

export const mutateCostTrackingAudit = async (
  repository: CostTrackingAuditRepository,
  mutation: (current: CostTrackingAuditAttributes) => CostTrackingAuditAttributes
): Promise<CostTrackingAuditAttributes> => {
  for (let attempt = 0; attempt < MAX_OCC_ATTEMPTS; attempt++) {
    let savedObject: Awaited<ReturnType<CostTrackingAuditRepository['get']>> | undefined;
    try {
      savedObject = await repository.get<CostTrackingAuditAttributes>(
        COST_TRACKING_AUDIT_SO_TYPE,
        COST_TRACKING_AUDIT_SO_ID
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
        throw error;
      }
    }

    const current: CostTrackingAuditAttributes = savedObject
      ? (savedObject.attributes as CostTrackingAuditAttributes)
      : { events: [], knownSpaces: [] };
    const next = mutation(current);
    try {
      const result = savedObject
        ? await repository.update<CostTrackingAuditAttributes>(
            COST_TRACKING_AUDIT_SO_TYPE,
            COST_TRACKING_AUDIT_SO_ID,
            next,
            { version: savedObject.version }
          )
        : await repository.create<CostTrackingAuditAttributes>(COST_TRACKING_AUDIT_SO_TYPE, next, {
            id: COST_TRACKING_AUDIT_SO_ID,
            overwrite: false,
          });
      return { ...next, ...result.attributes };
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error as Error)) {
        throw error;
      }
    }
  }
  throw new Error('Cost tracking audit could not be updated after repeated conflicts');
};

export const resolveFullTrackingCoverageStart = ({
  audit,
  currentSpaceIds,
}: {
  audit: CostTrackingAuditAttributes | undefined;
  currentSpaceIds: readonly string[];
}): string | undefined => {
  if (!audit || currentSpaceIds.length === 0) {
    return undefined;
  }
  const knownSpaceIds = new Set(audit.knownSpaces.map(({ id }) => id));
  const latestEventBySpace = new Map<string, CostTrackingAuditEvent>();
  for (const event of audit.events) {
    const eventTimestamp = Date.parse(event.changedAt);
    if (Number.isNaN(eventTimestamp)) {
      continue;
    }
    const previous = latestEventBySpace.get(event.spaceId);
    if (!previous || Date.parse(previous.changedAt) < eventTimestamp) {
      latestEventBySpace.set(event.spaceId, event);
    }
  }

  let coverageStart = 0;
  for (const spaceId of new Set(currentSpaceIds)) {
    const event = latestEventBySpace.get(spaceId);
    if (!knownSpaceIds.has(spaceId) || !event?.enabled) {
      return undefined;
    }
    coverageStart = Math.max(coverageStart, Date.parse(event.changedAt));
  }
  return coverageStart === 0 ? undefined : new Date(coverageStart).toISOString();
};
