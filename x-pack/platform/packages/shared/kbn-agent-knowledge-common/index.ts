/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENT_KNOWLEDGE_FEATURE_ID,
  AGENT_KNOWLEDGE_UI_CAPABILITY_MANAGE,
  AGENT_KNOWLEDGE_UI_CAPABILITY_SHOW,
  AGENT_KNOWLEDGE_RECALL_STEP_ID,
  AGENT_KNOWLEDGE_RECORD_STEP_ID,
} from './src/constants';

export {
  ALERTZERO_WIKI_AI_INDEX_DEST,
  ALERTZERO_WIKI_AI_INDEX_ID,
  ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS,
  ALERTZERO_WIKI_ENTITY_TYPES,
  ALERTZERO_WIKI_SECTIONS_BY_TYPE,
  AGENT_KNOWLEDGE_PRODUCTS,
  NIGHTSHIFT_WIKI_AI_INDEX_DEST,
  NIGHTSHIFT_WIKI_AI_INDEX_ID,
  NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS,
  NIGHTSHIFT_WIKI_ENTITY_TYPES,
  NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE,
  WIKI_AI_INDEX_DEST,
  WIKI_AI_INDEX_ID,
  WIKI_EDIT_ACTIONS,
  WIKI_ENTITY_TYPE_BUCKETS,
  WIKI_ENTITY_TYPES,
  WIKI_PAGE_STATUSES,
  WIKI_PROMOTION_CORROBORATIONS,
  WIKI_ROUND_KINDS,
  WIKI_SECTIONS_BY_TYPE,
} from './src/wiki/types';

export type {
  AgentKnowledgeProduct,
  AlertZeroWikiEntityType,
  GetWikiPageResponse,
  ListWikiPagesResponse,
  NightshiftWikiEntityType,
  WikiEditAction,
  WikiEntityType,
  WikiPage,
  WikiPageStatus,
  WikiPageSummary,
  WikiPageWrite,
  WikiRoundKind,
  WikiStats,
  WikiTypePack,
  WikiWriteProvenance,
} from './src/wiki/types';

export {
  parseWikiRelations,
  tidyWikiOntology,
  WIKI_RELATION_KINDS,
} from './src/wiki/wiki_relations';
export type { TidiedWikiOntology, WikiRelation, WikiRelationKind } from './src/wiki/wiki_relations';

export {
  RecallWikiStepId,
  recallWikiStepCommonDefinition,
  recallWikiStepInputSchema,
  recallWikiStepOutputSchema,
} from './src/step_types/recall_step';

export {
  RecordWikiStepId,
  recordWikiStepCommonDefinition,
  recordWikiStepInputSchema,
  recordWikiStepOutputSchema,
} from './src/step_types/record_step';
