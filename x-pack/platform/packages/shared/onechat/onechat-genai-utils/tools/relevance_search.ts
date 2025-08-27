/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import { flattenMappings } from './utils';
import type { PerformMatchSearchResponse } from './steps';
import { getIndexMappings, performMatchSearch } from './steps';

export type RelevanceSearchResponse = PerformMatchSearchResponse;

export const relevanceSearch = async ({
  term,
  index,
  size = 10,
  model,
  esClient,
}: {
  term: string;
  index: string;
  size?: number;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<RelevanceSearchResponse> => {

  console.log('**** relevance search', index, term);
  // TODO: retrieve mappings regardless of target type

  const mappings = await getIndexMappings({
    indices: [index],
    esClient,
  });
  const flattenedFields = flattenMappings(mappings[index]);

  const selectedFields = flattenedFields.filter(
    (field) => field.type === 'text' || field.type === 'semantic_text'
  );

  return performMatchSearch({
    term,
    fields: selectedFields,
    index,
    size,
    esClient,
  });
};
