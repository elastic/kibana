/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser, mutate } from '@elastic/esql';
import type { ElasticsearchClient } from '@kbn/core/server';

/** The index expressions in the `FROM` of an ES|QL query, or none when it does not parse. */
export const fromSourcesOf = (query: string): string[] => {
  const { root, errors } = Parser.parse(query);
  if (errors.length > 0) {
    return [];
  }
  return [...mutate.commands.from.sources.list(root)]
    .map((source) => source.index?.valueUnquoted ?? source.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
};

/** An index, data stream or alias name quoted for `FROM`. Index names cannot hold `"`. */
export const quoteSource = (name: string): string => `"${name}"`;

/** A field name quoted for ES|QL. */
export const quoteField = (name: string): string => `\`${name.replace(/`/g, '``')}\``;

const escapeRegExp = (text: string): string => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const wildcardToRegExp = (pattern: string): RegExp =>
  new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`);

/** Whether an index expression of a `FROM`, such as `logs-*`, names a dataset. */
export const sourceMatchesDataset = (source: string, dataset: string): boolean =>
  source.includes('*') ? wildcardToRegExp(source).test(dataset) : source === dataset;

export interface EsqlRows {
  columns: string[];
  rows: unknown[][];
}

/** Runs an ES|QL query and returns its column names and rows. */
export const runEsql = async (
  esClient: ElasticsearchClient,
  query: string,
  abortSignal?: AbortSignal
): Promise<EsqlRows> => {
  const response = await esClient.esql.query({ query }, { signal: abortSignal });
  return {
    columns: response.columns.map(({ name }) => name),
    rows: response.values as unknown[][],
  };
};

/** The first row of an ES|QL result as an object keyed by column name. */
export const firstRow = ({ columns, rows }: EsqlRows): Record<string, unknown> => {
  const [row] = rows;
  return row ? Object.fromEntries(columns.map((name, index) => [name, row[index]])) : {};
};
