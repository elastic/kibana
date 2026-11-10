/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MAX_FIELD_VALUE_OPTIONS } from '../../common/constants';
import type { FieldInfo, FieldValuesResponse } from '../../common/types';
import { FACETABLE_TYPES } from '../../common/types';
import { runEsql } from './esql';
import { quoteIdentifier, toSource } from './esql_builder';

const COUNT_COLUMN = '__count';

/** Lists the columns ES|QL exposes for an index pattern, skipping unsupported types. */
export async function getFields(
  esClient: ElasticsearchClient,
  index: string
): Promise<FieldInfo[]> {
  const { columns } = await runEsql({
    esClient,
    body: { query: `FROM ${toSource(index)}\n| LIMIT 0`, params: [] },
  });
  return columns
    .filter(({ type }) => type !== 'unsupported')
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Builds a name to type lookup for query construction. */
export function toFieldTypeMap(fields: readonly FieldInfo[]): ReadonlyMap<string, string> {
  return new Map(fields.map(({ name, type }) => [name, type]));
}

/** Lists a field's distinct values when there are few enough to offer as choices. */
export async function getFieldValues({
  esClient,
  index,
  field,
}: {
  esClient: ElasticsearchClient;
  index: string;
  field: string;
}): Promise<FieldValuesResponse> {
  const fields = await getFields(esClient, index);
  const type = fields.find(({ name }) => name === field)?.type;
  if (!type || !FACETABLE_TYPES.has(type)) {
    return { values: [], complete: false };
  }

  const column = quoteIdentifier(field);
  const { columns, values } = await runEsql({
    esClient,
    body: {
      query: [
        `FROM ${toSource(index)}`,
        `| WHERE ${column} IS NOT NULL`,
        `| STATS ${COUNT_COLUMN} = COUNT(*) BY ${column}`,
        `| SORT ${column} ASC`,
        `| LIMIT ${MAX_FIELD_VALUE_OPTIONS + 1}`,
      ].join('\n'),
      params: [],
    },
  });
  if (values.length > MAX_FIELD_VALUE_OPTIONS) {
    return { values: [], complete: false };
  }

  const countPosition = columns.findIndex(({ name }) => name === COUNT_COLUMN);
  const valuePosition = columns.findIndex(({ name }) => name === field);
  return {
    values: values.map((row) => {
      const label = String(row[valuePosition]);
      return { value: label, label, count: Number(row[countPosition]) };
    }),
    complete: true,
  };
}
