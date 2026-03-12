/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { PerformMatchSearchResponse } from './steps';
import { performMatchSearch } from './steps';
import { resolveResource } from './utils/resources';

export type RelevanceSearchResponse = PerformMatchSearchResponse;

const SEARCHABLE_TEXT_FIELD_TYPES = new Set([
  'match_only_text',
  'pattern_text',
  'semantic_text',
  'text',
]);

export const relevanceSearch = async ({
  term,
  target,
  size = 10,
  model,
  esClient,
  logger,
}: {
  term: string;
  target: string;
  size?: number;
  model: ScopedModel;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<RelevanceSearchResponse> => {
  const { fields } = await resolveResource({ resourceName: target, esClient });

  const selectedFields = fields.filter((field) => SEARCHABLE_TEXT_FIELD_TYPES.has(field.type));

  if (selectedFields.length === 0) {
    throw new Error('No searchable text fields found, aborting search.');
  }

  return performMatchSearch({
    term,
    index: target,
    fields: selectedFields,
    size,
    esClient,
    logger,
  });
};
