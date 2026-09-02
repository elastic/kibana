/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  COST_TRACKING_AUDIT_MAX_EVENTS,
  COST_TRACKING_AUDIT_SO_TYPE,
  type CostTrackingAuditAttributes,
  type CostTrackingAuditRepository,
  mutateCostTrackingAudit,
  readCostTrackingAudit,
  resolveFullTrackingCoverageStart,
} from './tracking_audit';

export interface CostTrackingSpace {
  id: string;
  name: string;
}

export interface CostTrackingSpaceState extends CostTrackingSpace {
  tracking: 'enabled' | 'disabled' | 'unknown';
}

export interface SpaceTrackingCoverage {
  spaces: CostTrackingSpaceState[];
  currentSpaceTracking: CostTrackingSpaceState['tracking'];
  coveredSpaceCount: number;
  totalSpaceCount: number;
  unavailableSpaceCount: number;
  allSpacesTracked: boolean;
  fullTrackingSince?: string;
  auditUnavailable: boolean;
  auditScope: 'significant_events_control_only';
  untrackedSpaces: CostTrackingSpace[];
  newSpaces: CostTrackingSpace[];
}

export interface SpaceTrackingAccess {
  listSpaces: () => Promise<CostTrackingSpace[]>;
  getTrackingEnabled: (spaceId: string) => Promise<boolean>;
  setTrackingEnabled: (spaceId: string, enabled: boolean) => Promise<void>;
}

export interface SetAllSpacesTrackingResult {
  enabled: boolean;
  updatedSpaceIds: string[];
  failedSpaces: Array<CostTrackingSpace & { error: string }>;
  audit?: CostTrackingAuditAttributes;
  auditRecorded: boolean;
  auditError?: string;
}

export const createCostTrackingAuditRepository = (
  coreStart: CoreStart
): CostTrackingAuditRepository =>
  coreStart.savedObjects.getUnsafeInternalClient({
    includedHiddenTypes: [COST_TRACKING_AUDIT_SO_TYPE],
  });

export const createSpaceTrackingAccess = ({
  coreStart,
  spaces,
  request,
}: {
  coreStart: CoreStart;
  spaces?: SpacesPluginStart;
  request: KibanaRequest;
}): SpaceTrackingAccess => {
  const internalRepository = coreStart.savedObjects.getUnsafeInternalClient();
  const uiSettingsClients = new Map<
    string,
    ReturnType<CoreStart['uiSettings']['asScopedToClient']>
  >();
  const getUiSettingsClient = (spaceId: string) => {
    const cached = uiSettingsClients.get(spaceId);
    if (cached) {
      return cached;
    }
    const client = coreStart.uiSettings.asScopedToClient(
      internalRepository.asScopedToNamespace(spaceId)
    );
    uiSettingsClients.set(spaceId, client);
    return client;
  };

  return {
    listSpaces: async () => {
      if (!spaces) {
        return [{ id: DEFAULT_SPACE_ID, name: 'Default' }];
      }
      const allSpaces = await spaces.spacesService.createSpacesClient(request).getAll();
      return allSpaces.map(({ id, name }) => ({ id, name }));
    },
    getTrackingEnabled: async (spaceId) =>
      (await getUiSettingsClient(spaceId).get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING)) ??
      false,
    setTrackingEnabled: async (spaceId, enabled) => {
      await getUiSettingsClient(spaceId).setMany({
        [GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING]: enabled,
      });
    },
  };
};

export const getSpaceTrackingCoverage = async ({
  access,
  audit,
  auditUnavailable = false,
  currentSpaceId,
  logger,
}: {
  access: SpaceTrackingAccess;
  audit: CostTrackingAuditAttributes | undefined;
  auditUnavailable?: boolean;
  currentSpaceId: string;
  logger: Pick<Logger, 'warn'>;
}): Promise<SpaceTrackingCoverage> => {
  const spaces = (await access.listSpaces()).sort((left, right) => left.id.localeCompare(right.id));
  const states = await Promise.all(
    spaces.map(async (space): Promise<CostTrackingSpaceState> => {
      try {
        const enabled = await access.getTrackingEnabled(space.id);
        return { ...space, tracking: enabled ? 'enabled' : 'disabled' };
      } catch (error) {
        logger.warn(
          `Token usage tracking state could not be read for space "${space.id}": ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return { ...space, tracking: 'unknown' };
      }
    })
  );
  const coveredSpaceCount = states.filter(({ tracking }) => tracking === 'enabled').length;
  const unavailableSpaceCount = states.filter(({ tracking }) => tracking === 'unknown').length;
  const knownSpaceIds = new Set(audit?.knownSpaces.map(({ id }) => id) ?? []);
  const allSpacesTracked =
    states.length > 0 && states.every(({ tracking }) => tracking === 'enabled');

  return {
    spaces: states,
    currentSpaceTracking: states.find(({ id }) => id === currentSpaceId)?.tracking ?? 'unknown',
    coveredSpaceCount,
    totalSpaceCount: states.length,
    unavailableSpaceCount,
    allSpacesTracked,
    auditUnavailable,
    auditScope: 'significant_events_control_only',
    ...(allSpacesTracked && !auditUnavailable
      ? {
          fullTrackingSince: resolveFullTrackingCoverageStart({
            audit,
            currentSpaceIds: states.map(({ id }) => id),
          }),
        }
      : {}),
    untrackedSpaces: states
      .filter(({ tracking }) => tracking !== 'enabled')
      .map(({ id, name }) => ({ id, name })),
    newSpaces: states
      .filter(({ id }) => !knownSpaceIds.has(id))
      .map(({ id, name }) => ({ id, name })),
  };
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const setTokenUsageTrackingInAllSpaces = async ({
  access,
  auditRepository,
  enabled,
  changedBy,
  now = new Date(),
}: {
  access: SpaceTrackingAccess;
  auditRepository: CostTrackingAuditRepository;
  enabled: boolean;
  changedBy: string;
  now?: Date;
}): Promise<SetAllSpacesTrackingResult> => {
  const spaces = (await access.listSpaces()).sort((left, right) => left.id.localeCompare(right.id));
  const previousTracking = new Map<string, boolean | undefined>();
  await Promise.all(
    spaces.map(async ({ id }) => {
      try {
        previousTracking.set(id, await access.getTrackingEnabled(id));
      } catch {
        previousTracking.set(id, undefined);
      }
    })
  );
  const updates = await Promise.allSettled(
    spaces.map(async (space) => {
      await access.setTrackingEnabled(space.id, enabled);
      return space;
    })
  );
  const updatedSpaces = updates.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  );
  const failedSpaces = updates.flatMap((result, index) =>
    result.status === 'rejected' ? [{ ...spaces[index], error: errorMessage(result.reason) }] : []
  );

  if (updatedSpaces.length === 0) {
    return { enabled, updatedSpaceIds: [], failedSpaces, auditRecorded: true };
  }

  const changedAt = now.toISOString();
  const updatedSpaceIds = new Set(updatedSpaces.map(({ id }) => id));
  let audit: CostTrackingAuditAttributes | undefined;
  let auditError: string | undefined;
  try {
    audit = await mutateCostTrackingAudit(auditRepository, (current) => {
      const knownSpaceIds = new Set(current.knownSpaces.map(({ id }) => id));
      const latestEventBySpace = new Map(
        current.events.map((event) => [event.spaceId, event] as const)
      );
      const existingEventKeys = new Set(
        current.events.map(
          (event) => `${event.spaceId}:${event.enabled}:${event.changedAt}:${event.changedBy}`
        )
      );
      const events = updatedSpaces.flatMap(({ id }) => {
        const latestEvent = latestEventBySpace.get(id);
        if (
          previousTracking.get(id) === enabled &&
          knownSpaceIds.has(id) &&
          latestEvent?.enabled === enabled
        ) {
          return [];
        }
        const event = { spaceId: id, enabled, changedAt, changedBy };
        const key = `${event.spaceId}:${event.enabled}:${event.changedAt}:${event.changedBy}`;
        return existingEventKeys.has(key) ? [] : [event];
      });
      const nextKnownSpaces = [
        ...current.knownSpaces,
        ...spaces.filter(({ id }) => updatedSpaceIds.has(id) && !knownSpaceIds.has(id)),
      ];
      return {
        events: [...current.events, ...events].slice(-COST_TRACKING_AUDIT_MAX_EVENTS),
        knownSpaces: nextKnownSpaces,
      };
    });
  } catch (error) {
    auditError = errorMessage(error);
  }

  return {
    enabled,
    updatedSpaceIds: updatedSpaces.map(({ id }) => id),
    failedSpaces,
    audit,
    auditRecorded: auditError === undefined,
    ...(auditError ? { auditError } : {}),
  };
};

export const loadSpaceTrackingCoverage = async ({
  access,
  auditRepository,
  currentSpaceId,
  logger,
}: {
  access: SpaceTrackingAccess;
  auditRepository: CostTrackingAuditRepository;
  currentSpaceId: string;
  logger: Pick<Logger, 'warn'>;
}): Promise<SpaceTrackingCoverage> =>
  getSpaceTrackingCoverage({
    access,
    audit: await readCostTrackingAudit(auditRepository),
    currentSpaceId,
    logger,
  });
