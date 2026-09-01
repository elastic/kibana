/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type ObjectType } from '@kbn/config-schema';
import type { RunLimit } from '../../../common/run_quotas';

export const RUN_QUOTA_SETTINGS_SO_TYPE = 'significant-events-run-quota-settings';
export const RUN_QUOTA_SETTINGS_SO_ID = RUN_QUOTA_SETTINGS_SO_TYPE;
export const RUN_QUOTA_LEDGER_SO_TYPE = 'significant-events-run-quota-ledger';

export const RUN_QUOTA_MAX_ALLOWED_GRANT_KEYS = 10_000;
export const RUN_QUOTA_MAX_ALLOWED_INVESTIGATION_KEYS = 10_000;

const MAX_DATE_LENGTH = 64;
const MAX_GROUP_LENGTH = 64;
const MAX_ID_LENGTH = 1024;
const MAX_ACTOR_LENGTH = 1024;

export interface RunQuotaSettingsAttributes extends Record<string, unknown> {
  limits: Record<string, RunLimit>;
  enforcementEnabled?: boolean;
  enabledBy?: string;
  enabledAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface RunQuotaAllowedInvestigationKey {
  eventUuid: string;
  eventId: string;
}

export interface RunQuotaLedgerAttributes extends Record<string, unknown> {
  date: string;
  group: string;
  count: number;
  criticalOverrideCount: number;
  allowedGrantKeys: string[];
  allowedInvestigationKeys: RunQuotaAllowedInvestigationKey[];
}

const runLimitSchemaV1 = schema.oneOf([
  schema.object({
    enabled: schema.literal(false),
    max: schema.literal(0),
  }),
  schema.object({
    enabled: schema.literal(true),
    max: schema.number({ min: 1, max: 10_000 }),
  }),
]);

const runQuotaSettingsAttributesV1 = schema.object({
  limits: schema.recordOf(schema.string({ maxLength: MAX_GROUP_LENGTH }), runLimitSchemaV1),
  enforcementEnabled: schema.maybe(schema.boolean()),
  enabledBy: schema.maybe(schema.string({ maxLength: MAX_ACTOR_LENGTH })),
  enabledAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  updatedBy: schema.maybe(schema.string({ maxLength: MAX_ACTOR_LENGTH })),
  updatedAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
});

const allowedInvestigationKeySchemaV1 = schema.object({
  eventUuid: schema.string({ maxLength: MAX_ID_LENGTH }),
  eventId: schema.string({ maxLength: MAX_ID_LENGTH }),
});

const runQuotaLedgerAttributesV1 = schema.object({
  date: schema.string({ maxLength: MAX_DATE_LENGTH }),
  group: schema.string({ maxLength: MAX_GROUP_LENGTH }),
  count: schema.number({ min: 0 }),
  criticalOverrideCount: schema.number({ min: 0 }),
  allowedGrantKeys: schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), {
    maxSize: RUN_QUOTA_MAX_ALLOWED_GRANT_KEYS,
  }),
  allowedInvestigationKeys: schema.arrayOf(allowedInvestigationKeySchemaV1, {
    maxSize: RUN_QUOTA_MAX_ALLOWED_INVESTIGATION_KEYS,
  }),
});

const createSavedObjectType = ({
  name,
  attributesSchema,
  properties,
}: {
  name: string;
  attributesSchema: ObjectType;
  properties: SavedObjectsType['mappings']['properties'];
}): SavedObjectsType => ({
  name,
  hidden: true,
  namespaceType: 'agnostic',
  mappings: {
    dynamic: false,
    properties,
  },
  management: {
    importableAndExportable: false,
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: attributesSchema.extends({}, { unknowns: 'ignore' }),
        create: attributesSchema.extends({}, { unknowns: 'allow' }),
      },
    },
  },
});

export const getRunQuotaSavedObjectTypes = (): SavedObjectsType[] => [
  createSavedObjectType({
    name: RUN_QUOTA_SETTINGS_SO_TYPE,
    attributesSchema: runQuotaSettingsAttributesV1,
    properties: {},
  }),
  createSavedObjectType({
    name: RUN_QUOTA_LEDGER_SO_TYPE,
    attributesSchema: runQuotaLedgerAttributesV1,
    properties: {
      date: { type: 'keyword', ignore_above: 64 },
      group: { type: 'keyword', ignore_above: 64 },
    },
  }),
];
