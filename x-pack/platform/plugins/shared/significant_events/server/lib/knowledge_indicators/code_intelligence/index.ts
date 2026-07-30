/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CODE_FEATURE_SUBTYPE_LANGUAGE,
  CODE_FEATURE_SUBTYPE_REPO_TYPE,
  CODE_FEATURE_SUBTYPE_SERVICE_NAME,
  CODE_INTELLIGENCE_AGENT_ID,
} from './constants';
export { isCodeIntelligenceAgentAvailable } from './is_agent_available';
export { classifyRepository } from './classify_repository';
export { reconcileCodeFeatures } from './reconcile_code_features';
export {
  readCodeChangeState,
  buildCodeChangeMeta,
  isUnchanged,
  type CodeChangeState,
} from './code_change_state';
export {
  identifyCodeFeaturesForService,
  type IdentifyCodeForServiceOptions,
  type IdentifyCodeForServiceResult,
  type RepositoryServiceResult,
} from './identify_code_features';
export {
  linkServiceEntities,
  resolveIngestingStreams,
  resolveLogBearingStreams,
  type ServiceCodeMetadata,
  type StreamSamplingSource,
  type LogStreamBinding,
} from './link_ingesting_streams';
export { extractLogSignatures, staticPrefixOf } from './extract_log_signatures';
export {
  discoverLoggingSites,
  codeGrep,
  splitRepository,
  type GrepLine,
  type CodeGrepOptions,
  type DiscoverLoggingSitesOptions,
} from './discover_logging_sites';
export {
  generatePredictiveQueries,
  buildPredictiveEsql,
  isValidEsqlSyntax,
} from './generate_predictive_queries';
export {
  identifyCodeQueries,
  type IdentifyCodeQueriesOptions,
  type IdentifyCodeQueriesResult,
  type IdentifyCodeQueriesStatus,
} from './identify_code_queries';
export {
  reconcileCodeAndLogQueries,
  buildQueryReconcilePlan,
  toReconcileOperations,
  computeClusters,
  pickCanonical,
  type QueryMerge,
  type QueryReconcilePlan,
  type ReconcileQueriesResult,
} from './reconcile_query_kis';
export type {
  CodeEvidenceCitation,
  RepoClassification,
  RepoType,
  LanguageCount,
  LoggingChunk,
  LogSignature,
} from './types';
