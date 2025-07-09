/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ScopedModel } from '@kbn/onechat-server';
import { indexExplorer } from './index_explorer';
import { flattenMappings } from './utils';
import { getIndexMappings, performMatchSearch, PerformMatchSearchResponse } from './steps';

export type RelevanceSearchResponse = PerformMatchSearchResponse;

export const relevanceSearch = async ({
  term,
  index,
  fields = [],
  size = 10,
  model,
  esClient,
}: {
  term: string;
  index?: string;
  fields?: string[];
  size?: number;
  model: ScopedModel;
  esClient: ElasticsearchClient;
}): Promise<RelevanceSearchResponse> => {
  let selectedIndex = index;
  let selectedFields = fields;

  if (!selectedIndex) {
    const { indices } = await indexExplorer({
      query: term,
      esClient,
      model,
    });
    if (indices.length === 0) {
      return { results: [] };
    }
    selectedIndex = indices[0].indexName;
  }

  if (!fields.length) {
    const mappings = await getIndexMappings({
      indices: [selectedIndex],
      esClient,
    });

    const flattenedFields = flattenMappings(mappings[selectedIndex]);

    selectedFields = flattenedFields
      .filter((field) => field.type === 'text' || field.type === 'semantic_text')
      .map((field) => field.path);
  }

  return performMatchSearch({
    term,
    fields: selectedFields,
    index: selectedIndex,
    size,
    esClient,
  });
};
