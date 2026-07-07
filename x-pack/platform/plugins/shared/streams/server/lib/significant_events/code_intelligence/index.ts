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
} from './constants';
export { classifyRepository } from './classify_repository';
export { resolveServiceName, rankServiceName, normalizeServiceName } from './resolve_service_name';
export { reconcileCodeFeatures } from './reconcile_code_features';
export {
  readCodeChangeState,
  buildCodeChangeMeta,
  isUnchanged,
  type CodeChangeState,
} from './code_change_state';
export { createCodeRepositoryReader } from './code_repository_reader';
export {
  identifyCodeFeatures,
  type IdentifyCodeFeaturesOptions,
  type IdentifyCodeFeaturesResult,
  type IdentifyCodeFeaturesStatus,
} from './identify_code_features';
export { extractLogSignatures, staticPrefixOf } from './extract_log_signatures';
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
export type {
  CodeRepositoryReader,
  RepoClassification,
  RepoType,
  ServiceNameCandidate,
  ServiceNameResolution,
  LanguageCount,
  CodeHit,
  LoggingChunk,
  LogSignature,
} from './types';
