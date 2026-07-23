/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public entry point of the significant-events eval suite. The sibling
 * `@kbn/evals-suite-significant-events-live` suite (full end-to-end replay evals) builds on the
 * replay infrastructure, dataset ground truth, and discovery evaluators defined here.
 */

// Replay infrastructure -----------------------------------------------------
export type { GcsConfig } from './src/data_generators/snapshot_run_config';
export { SIGEVENTS_SNAPSHOT_RUN, resolveBasePath } from './src/data_generators/snapshot_run_config';
export { listAvailableSnapshots } from './src/data_generators/list_snapshots';
export {
  ensureStreamsEnabled,
  SIGEVENTS_WIRED_ROOTS,
} from './src/data_generators/ensure_streams_enabled';
export { cleanSignificantEventsDataStreams } from './src/data_generators/replay_logs_snapshot';
export type { ReplayStats } from './src/data_generators/replay_into_managed_stream';
export {
  replayIntoManagedStream,
  deleteTemporaryReplayIndices,
  // Internal steps of the managed-stream replay, reused by the live suite's baseline-slice
  // replay (which reindexes only the pre-incident portion of a snapshot).
  replayTempPrefix,
  getLogsIndicesFromSnapshot,
  restoreLogsIndicesToTemp,
  getMaxTimestampFromTempIndices,
  getWriteIndexInfo,
  getReplayChainPipeline,
  createReplayPipeline,
  setWriteIndexDefaultPipeline,
} from './src/data_generators/replay_into_managed_stream';
export { replayKnowledgeIndicatorsSnapshot } from './src/data_generators/replay_knowledge_indicators_snapshot';
export {
  DETECTIONS_DATA_STREAM,
  DISCOVERIES_DATA_STREAM,
  EVENTS_DATA_STREAM,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
} from './src/data_generators/snapshot_indices';
export { buildAvailableSnapshotsBySource } from './src/data_generators/available_snapshots';

// Dataset utilities and ground truth ----------------------------------------
export type { DatasetConfig, SamplingCriterion, SnapshotSourceOverride } from './src/datasets';
export {
  MANAGED_STREAM_SEARCH_PATTERN,
  resolveScenarioSnapshotSource,
  snapshotCatalogKey,
  snapshotSourceKey,
} from './src/datasets';
export {
  BANK_OF_ANTHOS_GCS_BASE_PATH_PREFIX,
  BANK_OF_ANTHOS_NAMESPACE,
  GCS_BUCKET,
} from './src/constants';
export {
  BENIGN_AUTH_DISCOVERY,
  LEDGER_DB_CASCADE_DISCOVERY,
} from './src/datasets/bank_of_anthos/discovery';

// Discovery-stage evaluators (reused for full-funnel scoring) ----------------
export { createDiscoveryEvaluators } from './src/evaluators/discovery';
export type {
  AgentOutputBase,
  DiscoveryAgentOutput,
  ExampleOutputBase,
} from './src/evaluators/discovery/types';
export { createEvidenceDescriptionEvaluator } from './src/evaluators/discovery/common/evidence_quality';
export {
  createConfidenceCalibrationEvaluator,
  createSeverityCalibrationEvaluator,
} from './src/evaluators/discovery/common/scores_calibration';
export type { CreateScenarioCriteriaLlmEvaluatorOptions } from './src/evaluators/scenario_criteria/evaluators';
export { createScenarioCriteriaLlmEvaluator } from './src/evaluators/scenario_criteria/evaluators';
export { extractDiscoveriesFromToolCall } from './src/evaluators/discovery/utils/parse_agent_output';
export { buildDiscoveryInput } from './src/evaluators/discovery/discovery/build_agent_input';
