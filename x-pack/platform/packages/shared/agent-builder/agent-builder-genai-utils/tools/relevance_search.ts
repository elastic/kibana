/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { PerformMatchSearchResponse, TopSnippetsConfig } from './steps';
import { performMatchSearch } from './steps';
import { resolveResource } from './utils/resources';

export type RelevanceSearchResponse = PerformMatchSearchResponse;

const SEARCHABLE_TEXT_FIELD_TYPES = new Set([
  'match_only_text',
  'pattern_text',
  'semantic_text',
  'text',
]);

const isSearchableTextField = (field: { type: string; searchable?: boolean }): boolean =>
  SEARCHABLE_TEXT_FIELD_TYPES.has(field.type) && field.searchable !== false;

const isSearchableDenseVectorField = (field: {
  type: string;
  searchable?: boolean;
  inferenceId?: string;
}): boolean =>
  field.type === 'dense_vector' && field.searchable !== false && field.inferenceId != null;

export const relevanceSearch = async ({
  term,
  target,
  size = 10,
  model,
  esClient,
  logger,
  topSnippetsConfig,
}: {
  term: string;
  target: string;
  size?: number;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
  /** When provided, uses ES|QL TOP_SNIPPETS instead of ES highlighting. */
  topSnippetsConfig?: TopSnippetsConfig;
}): Promise<RelevanceSearchResponse> => {
  const { fields } = await resolveResource({ resourceName: target, esClient });

  const textFields = fields.filter(isSearchableTextField);
  const denseVectorFields = fields.filter(isSearchableDenseVectorField);

  if (textFields.length === 0 && denseVectorFields.length === 0) {
    throw new Error('No searchable fields found, aborting search.');
  }

  return performMatchSearch({
    term,
    index: target,
    fields: textFields,
    denseVectorFields,
    size,
    esClient,
    logger,
    topSnippetsConfig,
  });
};
