/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  WIKI_PAGE_STATUSES,
  WIKI_PROMOTION_CORROBORATIONS,
  type WikiPage,
  type WikiPageStatus,
  type WikiPageSummary,
  type WikiStats,
} from './src/types';
export {
  canonicalWikiId,
  canonicalizeSlug,
  createWikiPageStore,
  isVersionConflict,
  slugFromWikiId,
  statusAfterCorroboration,
  toWikiKiId,
  toWikiPageId,
  type WikiPageStore,
  type WikiPageWrite,
} from './src/page_store';
export { lintWikiContent, type WikiLintRule, type WikiLintViolation } from './src/lint_content';
export { dropEmptySections } from './src/drop_empty_sections';
export {
  WIKI_RELATION_KINDS,
  parseWikiRelations,
  tidyWikiOntology,
  type TidiedWikiOntology,
  type WikiRelation,
  type WikiRelationKind,
} from './src/wiki_relations';
