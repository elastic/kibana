/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { consumeRunQuota } from './consume';
export { countRunQuotaWorkflowExecutions, RUN_QUOTA_WORKFLOW_IDS_BY_GROUP } from './counting';
export { waitForInvestigationEvidence } from './investigation_evidence';
export {
  ensureRunQuotaHousekeepingScheduled,
  registerRunQuotaHousekeepingTask,
  RUN_QUOTA_HOUSEKEEPING_INTERVAL,
  RUN_QUOTA_HOUSEKEEPING_INTERVAL_MS,
  RUN_QUOTA_HOUSEKEEPING_TASK_ID,
  RUN_QUOTA_HOUSEKEEPING_TASK_TYPE,
  runRunQuotaHousekeeping,
} from './housekeeping';
export {
  createRunQuotaExecutionReader,
  validateHeartbeatProvenance,
  validateInvestigationProvenance,
  validateWorkerProvenance,
} from './provenance';
export { assertCanManageRunQuotas, canManageRunQuotas } from './privileges';
export type {
  RunQuotaExecutionReader,
  RunQuotaWorkflowExecution,
  ValidatedHeartbeatProvenance,
  ValidatedWorkerProvenance,
} from './provenance';
export { reserveInvestigationRunQuota } from './reserve';
export type { RunQuotaEventResolver } from './reserve';
export { computeRunQuotaDriverHealth } from './reachability';
export type { DetectionReachabilityTarget, KiReachabilityTarget } from './reachability';
export { deleteExpiredRunQuotaDocuments, sweepExpiredRunQuotaDocuments } from './retention';
export type { RunQuotaRetentionRepository } from './retention';
export {
  applyRunQuotaSettingsApplicabilityTransition,
  recordRunQuotaScheduleTransition,
} from './transitions';
export {
  createRunQuotaInternalRepository,
  createDefaultRunQuotaSettingsAttributes,
  createEmptyRunQuotaLedger,
  getRunQuotaHeartbeatId,
  getRunQuotaLedgerId,
  mutateRunQuotaHeartbeat,
  mutateRunQuotaLedger,
  mutateRunQuotaSettings,
  readRunQuotaSettings,
  updateRunQuotaHeartbeatMaxTimestamp,
} from './repository';
export type {
  RunQuotaHeartbeatMutation,
  RunQuotaLedgerMutation,
  RunQuotaSavedObjectsRepository,
  RunQuotaSettingsMutation,
  RunQuotaSettingsPatch,
} from './repository';
export {
  getRunQuotaSavedObjectTypes,
  RUN_QUOTA_HEARTBEAT_SO_TYPE,
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_MAX_CONSUMED_GRANT_KEYS,
  RUN_QUOTA_MAX_DECISIONS,
  RUN_QUOTA_MAX_SKIPPED_ROWS,
  RUN_QUOTA_SETTINGS_SO_ID,
  RUN_QUOTA_SETTINGS_SO_TYPE,
  RUN_QUOTA_WORKER_DECISION_SO_TYPE,
} from './saved_objects';
export type {
  PersistedRunQuotaDriverHealth,
  RunQuotaApplicabilityGeneration,
  RunQuotaApplicabilityState,
  RunQuotaHeartbeatAttributes,
  RunQuotaInvestigationDecision,
  RunQuotaLedgerAttributes,
  RunQuotaSettingsAttributes,
  RunQuotaSkippedRow,
  RunQuotaWorkerDecisionAttributes,
} from './saved_objects';
export { dayKey, resolveDailyWindow } from './window';
export {
  finalizeWorkerDecision,
  getOrCreatePendingWorkerDecision,
  getRunQuotaWorkerDecisionId,
} from './worker_decision';
