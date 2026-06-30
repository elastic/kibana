/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  KnowledgeIndicatorClient,
  type KIBulkOperation,
  type RuleUnbackedFilter,
} from './knowledge_indicator_client';
export { KnowledgeIndicatorService } from './knowledge_indicator_service';
export {
  knowledgeIndicatorsDataStream,
  KNOWLEDGE_INDICATORS_DATA_STREAM,
  type StoredFeature,
  type StoredFeatureKnowledgeIndicator,
  type StoredKnowledgeIndicator,
  type StoredQuery,
  type StoredQueryKnowledgeIndicator,
  type StoredTombstone,
  isStoredFeatureKnowledgeIndicator,
  isStoredQueryKnowledgeIndicator,
} from './data_stream';
export { initializeKnowledgeIndicatorsTemplate } from './initialize_template';
export { KI_TYPE_FEATURE, KI_TYPE_QUERY, type KnowledgeIndicatorType } from './fields';
