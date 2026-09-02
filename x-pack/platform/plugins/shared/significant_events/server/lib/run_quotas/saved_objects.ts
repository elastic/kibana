/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import { schema, type ObjectType } from '@kbn/config-schema';
import type {
  RunLimit,
  RunQuotaDriverHealthStatus,
  WorkerRunBudgetGroupId,
} from '../../../common/run_quotas';

export const RUN_QUOTA_SETTINGS_SO_TYPE = 'significant-events-run-quota-settings';
export const RUN_QUOTA_SETTINGS_SO_ID = RUN_QUOTA_SETTINGS_SO_TYPE;
export const RUN_QUOTA_LEDGER_SO_TYPE = 'significant-events-run-quota-ledger';
export const RUN_QUOTA_WORKER_DECISION_SO_TYPE = 'significant-events-run-quota-worker-decision';
export const RUN_QUOTA_HEARTBEAT_SO_TYPE = 'significant-events-run-quota-heartbeat';

export const RUN_QUOTA_MAX_DECISIONS = 500;
export const RUN_QUOTA_MAX_CONSUMED_GRANT_KEYS = 10_000;
export const RUN_QUOTA_MAX_SKIPPED_ROWS = 10_000;

const MAX_DATE_LENGTH = 64;
const MAX_GROUP_LENGTH = 64;
const MAX_ID_LENGTH = 1024;
const MAX_ACTOR_LENGTH = 1024;
const MAX_SPACE_ID_LENGTH = 1024;

export interface RunQuotaApplicabilityGeneration {
  generation: number;
  changedAt: string;
}

export interface RunQuotaApplicabilityState {
  global: RunQuotaApplicabilityGeneration;
  groups: Record<string, RunQuotaApplicabilityGeneration>;
}

export interface PersistedRunQuotaDriverHealth {
  status: RunQuotaDriverHealthStatus;
  checkedAt: string;
  staleSpaceIds?: string[];
}

export interface RunQuotaSettingsAttributes extends Record<string, unknown> {
  timezone: string;
  limits: Record<string, RunLimit>;
  enforcementEnabled?: boolean;
  enabledBy?: string;
  enabledAt?: string;
  updatedBy?: string;
  updatedAt?: string;
  lastAttemptedAt?: string;
  lastHousekeepingAt?: string;
  retentionWatermark?: string;
  applicability?: RunQuotaApplicabilityState;
  driverHealth?: Record<string, PersistedRunQuotaDriverHealth>;
}

export interface RunQuotaInvestigationDecision {
  eventUuid: string;
  eventId: string;
  actor: string;
  granted: boolean;
  pastLimit: boolean;
  decidedAt: string;
}

export interface RunQuotaSkippedRow {
  eventUuid: string;
  eventId: string;
  spaceId: string;
  severity: string;
  decidedAt: string;
}

export interface RunQuotaLedgerAttributes extends Record<string, unknown> {
  date: string;
  group: string;
  count: number;
  withinLimitGrantCount: number;
  criticalPastLimitGrantCount: number;
  consumedGrantKeys: string[];
  decisions: RunQuotaInvestigationDecision[];
  skipped: RunQuotaSkippedRow[];
  totalSkipped: number;
  decisionsEvicted: boolean;
}

export interface RunQuotaWorkerDecisionAttributes extends Record<string, unknown> {
  ledgerDate: string;
  group: WorkerRunBudgetGroupId;
  grantKey: string;
  latestExecutionId: string;
  state: 'pending' | 'allowed' | 'denied';
  limitSnapshot: number;
  createdAt: string;
  decidedAt?: string;
}

export interface RunQuotaHeartbeatAttributes extends Record<string, unknown> {
  group: WorkerRunBudgetGroupId;
  spaceId: string;
  driverExecutionId?: string;
  recordedAt?: string;
  monitoringSince?: string;
  monitoringEnabled: boolean;
  scheduleGeneration: number;
  scheduleGenerationChangedAt: string;
  observedApplicabilityToken?: string;
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

const applicabilityGenerationSchemaV1 = schema.object({
  generation: schema.number({ min: 0 }),
  changedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
});

const applicabilityStateSchemaV1 = schema.object({
  global: applicabilityGenerationSchemaV1,
  groups: schema.recordOf(
    schema.string({ maxLength: MAX_GROUP_LENGTH }),
    applicabilityGenerationSchemaV1
  ),
});

const persistedDriverHealthSchemaV1 = schema.object({
  status: schema.oneOf([
    schema.literal('healthy'),
    schema.literal('degraded'),
    schema.literal('unknown'),
    schema.literal('not_applicable'),
  ]),
  checkedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
  staleSpaceIds: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: MAX_SPACE_ID_LENGTH }), {
      maxSize: RUN_QUOTA_MAX_CONSUMED_GRANT_KEYS,
    })
  ),
});

const runQuotaSettingsAttributesV1 = schema.object({
  timezone: schema.string({ maxLength: MAX_DATE_LENGTH }),
  limits: schema.recordOf(schema.string({ maxLength: MAX_GROUP_LENGTH }), runLimitSchemaV1),
  enforcementEnabled: schema.maybe(schema.boolean()),
  enabledBy: schema.maybe(schema.string({ maxLength: MAX_ACTOR_LENGTH })),
  enabledAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  updatedBy: schema.maybe(schema.string({ maxLength: MAX_ACTOR_LENGTH })),
  updatedAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  lastAttemptedAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  lastHousekeepingAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  retentionWatermark: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  applicability: schema.maybe(applicabilityStateSchemaV1),
  driverHealth: schema.maybe(
    schema.recordOf(schema.string({ maxLength: MAX_GROUP_LENGTH }), persistedDriverHealthSchemaV1)
  ),
});

const investigationDecisionSchemaV1 = schema.object({
  eventUuid: schema.string({ maxLength: MAX_ID_LENGTH }),
  eventId: schema.string({ maxLength: MAX_ID_LENGTH }),
  actor: schema.string({ maxLength: MAX_ACTOR_LENGTH }),
  granted: schema.boolean(),
  pastLimit: schema.boolean(),
  decidedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
});

const skippedRowSchemaV1 = schema.object({
  eventUuid: schema.string({ maxLength: MAX_ID_LENGTH }),
  eventId: schema.string({ maxLength: MAX_ID_LENGTH }),
  spaceId: schema.string({ maxLength: MAX_SPACE_ID_LENGTH }),
  severity: schema.string({ maxLength: MAX_GROUP_LENGTH }),
  decidedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
});

const runQuotaLedgerAttributesV1 = schema.object({
  date: schema.string({ maxLength: MAX_DATE_LENGTH }),
  group: schema.string({ maxLength: MAX_GROUP_LENGTH }),
  count: schema.number({ min: 0 }),
  withinLimitGrantCount: schema.number({ min: 0 }),
  criticalPastLimitGrantCount: schema.number({ min: 0 }),
  consumedGrantKeys: schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), {
    maxSize: RUN_QUOTA_MAX_CONSUMED_GRANT_KEYS,
  }),
  decisions: schema.arrayOf(investigationDecisionSchemaV1, {
    maxSize: RUN_QUOTA_MAX_DECISIONS,
  }),
  skipped: schema.arrayOf(skippedRowSchemaV1, {
    maxSize: RUN_QUOTA_MAX_SKIPPED_ROWS,
  }),
  totalSkipped: schema.number({ min: 0 }),
  decisionsEvicted: schema.boolean(),
});

const runQuotaWorkerDecisionAttributesV1 = schema.object({
  ledgerDate: schema.string({ maxLength: MAX_DATE_LENGTH }),
  group: schema.string({ maxLength: MAX_GROUP_LENGTH }),
  grantKey: schema.string({ maxLength: MAX_ID_LENGTH }),
  latestExecutionId: schema.string({ maxLength: MAX_ID_LENGTH }),
  state: schema.oneOf([
    schema.literal('pending'),
    schema.literal('allowed'),
    schema.literal('denied'),
  ]),
  limitSnapshot: schema.number({ min: 1, max: 10_000 }),
  createdAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
  decidedAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
});

const runQuotaHeartbeatAttributesV1 = schema.object({
  group: schema.string({ maxLength: MAX_GROUP_LENGTH }),
  spaceId: schema.string({ maxLength: MAX_SPACE_ID_LENGTH }),
  driverExecutionId: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
  recordedAt: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  monitoringSince: schema.maybe(schema.string({ maxLength: MAX_DATE_LENGTH })),
  monitoringEnabled: schema.boolean(),
  scheduleGeneration: schema.number({ min: 0 }),
  scheduleGenerationChangedAt: schema.string({ maxLength: MAX_DATE_LENGTH }),
  observedApplicabilityToken: schema.maybe(schema.string({ maxLength: MAX_ID_LENGTH })),
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
  createSavedObjectType({
    name: RUN_QUOTA_WORKER_DECISION_SO_TYPE,
    attributesSchema: runQuotaWorkerDecisionAttributesV1,
    properties: {
      ledgerDate: { type: 'keyword', ignore_above: 64 },
      group: { type: 'keyword', ignore_above: 64 },
    },
  }),
  createSavedObjectType({
    name: RUN_QUOTA_HEARTBEAT_SO_TYPE,
    attributesSchema: runQuotaHeartbeatAttributesV1,
    properties: {
      group: { type: 'keyword', ignore_above: 64 },
      spaceId: { type: 'keyword', ignore_above: 1024 },
    },
  }),
];
