/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';

export const baseSpaceScopedQuery = (index: string, space: string): ComposerQuery =>
  esql.from([index], ['_id', '_source']).where`\`kibana.space_ids\` == ${space}`;

export const executeSourceQuery = async <T>(
  esClient: ElasticsearchClient,
  query: ComposerQuery
): Promise<{ hits: T[] }> => {
  const response = (await esClient.esql.query({
    query: query.print(),
  })) as ESQLSearchResponse;

  const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
  if (sourceIdx === -1) {
    return { hits: [] };
  }

  return {
    hits: response.values.map((row) => {
      const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
      const { kibana: _kibana, ...rest } = source;
      return rest as T;
    }),
  };
};
