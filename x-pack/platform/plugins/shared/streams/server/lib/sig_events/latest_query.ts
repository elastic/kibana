/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { type CommonSearchOptions } from './query_utils';

interface RunLatestEsqlQueryArgs<T> {
  esClient: ElasticsearchClient;
  space: string;
  options: CommonSearchOptions;
  index: string;
  stats: (query: ComposerQuery) => ComposerQuery;
  fields: ReadonlyArray<keyof T & string>;
}

export const runLatestEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  stats,
  fields,
}: RunLatestEsqlQueryArgs<T>): Promise<{ hits: T[] }> => {
  let query = esql.from(index).where`\`kibana.space_ids\` == ${space}`;

  if (options.from !== undefined) {
    const fromIso = new Date(options.from).toISOString();
    query = query.where`@timestamp > TO_DATETIME(${fromIso})`;
  }

  if (options.to !== undefined) {
    const toIso = new Date(options.to).toISOString();
    query = query.where`@timestamp < TO_DATETIME(${toIso})`;
  }

  query = stats(query);

  const response = (await esClient.esql.query({
    query: query.print(),
  })) as ESQLSearchResponse;

  const columnIndices = fields.map((f) => response.columns.findIndex((c) => c.name === f));
  if (columnIndices.some((i) => i === -1)) {
    return { hits: [] };
  }

  return {
    hits: response.values.map((row) => {
      const obj: Partial<Record<keyof T & string, unknown>> = {};
      fields.forEach((field, i) => {
        obj[field] = row[columnIndices[i]];
      });
      return obj as T;
    }),
  };
};
