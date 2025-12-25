/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import type { PerformMatchSearchResponse } from './steps';
import { performMatchSearch } from './steps';
import { resolveResource } from './utils/resources';

export type RelevanceSearchResponse = PerformMatchSearchResponse;

export const relevanceSearch = async ({
  term,
  target,
  size = 10,
  model,
  esClient,
}: {
  term: string;
  target: string;
  size?: number;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<RelevanceSearchResponse> => {
  const { fields } = await resolveResource({ resourceName: target, esClient });

  const selectedFields = fields.filter(
    (field) => field.type === 'text' || field.type === 'semantic_text'
  );

  if (selectedFields.length === 0) {
    throw new Error('No text or semantic_text fields found, aborting search.');
  }

  return performMatchSearch({
    term,
    index: target,
    fields: selectedFields,
    size,
    esClient,
  });
};
