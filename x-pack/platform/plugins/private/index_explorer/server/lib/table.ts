/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MAX_DEFAULT_COLUMNS,
  MAX_RESULT_WINDOW,
  MAX_SUGGESTED_FACET_CANDIDATES,
  MAX_SUGGESTED_FACET_CARDINALITY,
} from '../../common/constants';
import type {
  DocumentRow,
  EsqlColumn,
  EsqlRequestBody,
  EsqlResponse,
  FacetResult,
  FieldInfo,
  FieldValue,
  Filter,
  GetDocumentResponse,
  IndexMetadata,
  SearchRequestBody,
  SearchResponse,
  Sort,
  SuggestedFacet,
} from '../../common/types';
import { FACETABLE_TYPES } from '../../common/types';
import { runEsql } from './esql';
import { buildFilteredSource, quoteIdentifier, toSortCommand, toSource } from './esql_builder';
import { getFields, toFieldTypeMap } from './fields';

const ROW_METADATA = ['_id', '_index'];
const METADATA_COLUMNS = new Set([...ROW_METADATA, '_source']);
const DATE_TYPES = new Set(['date', 'date_nanos']);
const PREFERRED_FACET_TYPES = new Set(['keyword', 'boolean', 'ip', 'version']);
const PREFERRED_TIME_FIELD = '@timestamp';
const TOTAL_COLUMN = '__total';
const COUNT_COLUMN = '__count';

interface QueryState {
  readonly filters: readonly Filter[];
  readonly search?: string;
  readonly sort?: Sort;
  readonly columns?: readonly string[];
  readonly hiddenColumns?: readonly string[];
}

interface RowsQuery {
  readonly esql: EsqlRequestBody;
  readonly sort?: Sort;
  /** Columns kept by the query, in display order; empty when showing every column. */
  readonly keep: string[];
}

/** Picks the column to show first and sort by: `@timestamp`, else the first date field. */
export function findTimeField(fields: readonly FieldInfo[]): string | undefined {
  const dates = fields.filter(({ type }) => DATE_TYPES.has(type));
  return (dates.find(({ name }) => name === PREFERRED_TIME_FIELD) ?? dates[0])?.name;
}

function buildRowsQuery(
  index: string,
  state: QueryState,
  fields: readonly FieldInfo[],
  limit: number,
  defaultColumns: readonly string[] = []
): RowsQuery {
  const { base, params } = buildFilteredSource({
    index,
    filters: state.filters,
    search: state.search,
    fieldTypes: toFieldTypeMap(fields),
    metadata: ROW_METADATA,
  });
  const timeField = findTimeField(fields);
  const sort =
    state.sort ?? (timeField ? { field: timeField, direction: 'desc' as const } : undefined);

  const known = new Set([...ROW_METADATA, ...fields.map(({ name }) => name)]);
  const hidden = new Set(state.hiddenColumns ?? []);
  const explicit = (state.columns ?? []).filter((name) => known.has(name));
  const keep =
    explicit.length > 0
      ? explicit
      : defaultColumns.filter((name) => known.has(name) && !hidden.has(name));
  const drop = [...hidden].filter((name) => known.has(name) && !METADATA_COLUMNS.has(name));

  let columnCommand: string[] = [];
  if (keep.length > 0) {
    const kept = [...new Set([...ROW_METADATA, ...keep])];
    columnCommand = [
      `| KEEP ${kept
        .map((name) => (METADATA_COLUMNS.has(name) ? name : quoteIdentifier(name)))
        .join(', ')}`,
    ];
  } else if (drop.length > 0) {
    columnCommand = [`| DROP ${drop.map(quoteIdentifier).join(', ')}`];
  }
  const lines = [
    base,
    ...(sort ? [toSortCommand(sort)] : []),
    `| LIMIT ${limit}`,
    ...columnCommand,
  ];
  return { esql: { query: lines.join('\n'), params }, sort, keep };
}

/** Converts ES|QL rows into documents keyed by column name, splitting out `_id` and `_index`. */
export function toDocumentRows({ columns, values }: EsqlResponse): DocumentRow[] {
  const idPosition = columns.findIndex(({ name }) => name === '_id');
  const indexPosition = columns.findIndex(({ name }) => name === '_index');
  return values.map((row) => {
    const rowValues: Record<string, FieldValue> = {};
    columns.forEach(({ name }, position) => {
      if (!METADATA_COLUMNS.has(name)) {
        rowValues[name] = row[position];
      }
    });
    return {
      _id: String(row[idPosition] ?? ''),
      _index: String(row[indexPosition] ?? ''),
      values: rowValues,
    };
  });
}

/** Columns to display: the kept columns in order, or every data column when none are kept. */
export function displayColumns(
  columns: readonly EsqlColumn[],
  keep: readonly string[]
): EsqlColumn[] {
  if (keep.length > 0) {
    return keep.flatMap((name) => columns.filter((column) => column.name === name));
  }
  return columns.filter(({ name }) => !METADATA_COLUMNS.has(name));
}

function toFacetResult(field: string, result: EsqlResponse, total: number): FacetResult {
  const countPosition = result.columns.findIndex(({ name }) => name === COUNT_COLUMN);
  const valuePosition = result.columns.findIndex(({ name }) => name === field);
  let counted = 0;
  const buckets = result.values.flatMap((row) => {
    const count = Number(row[countPosition]);
    counted += count;
    const value = row[valuePosition];
    if (value === null || value === undefined) {
      return [];
    }
    const label = String(value);
    return [{ value: label, label, count }];
  });
  return { field, buckets, otherCount: Math.max(total - counted, 0) };
}

/**
 * Runs the ES|QL queries behind a table view: rows, total, facets and suggested facets.
 * Without `_col` or configured columns, the table shows the time field followed by the
 * fields that qualify as suggested facets, so the rows query waits for those statistics.
 */
export async function searchIndex({
  esClient,
  index,
  body,
  metadata,
}: {
  esClient: ElasticsearchClient;
  index: string;
  body: SearchRequestBody;
  metadata?: IndexMetadata;
}): Promise<SearchResponse> {
  const fields = await getFields(esClient, index);
  const { base, params } = buildFilteredSource({
    index,
    filters: body.filters,
    search: body.search,
    fieldTypes: toFieldTypeMap(fields),
  });

  const configuredColumns = metadata?.columns ?? [];
  const needsDefaultColumns = (body.columns ?? []).length === 0 && configuredColumns.length === 0;
  const candidates =
    body.suggestFacets || needsDefaultColumns
      ? fields
          .filter(({ type }) => FACETABLE_TYPES.has(type) && !DATE_TYPES.has(type))
          .sort(
            (left, right) =>
              Number(PREFERRED_FACET_TYPES.has(right.type)) -
              Number(PREFERRED_FACET_TYPES.has(left.type))
          )
          .slice(0, MAX_SUGGESTED_FACET_CANDIDATES)
      : [];
  const stats = [
    `${TOTAL_COLUMN} = COUNT(*)`,
    ...candidates.map(
      ({ name }, position) => `__s${position} = COUNT_DISTINCT(${quoteIdentifier(name)})`
    ),
  ];

  const statsPromise = runEsql({
    esClient,
    body: { query: `${base}\n| STATS ${stats.join(', ')}`, params },
  }).then(({ values: [statsRow = []] }) => {
    const total = Number(statsRow[0] ?? 0);
    const useful: SuggestedFacet[] = candidates.flatMap(({ name }, position) => {
      const cardinality = Number(statsRow[position + 1] ?? 0);
      const isUseful =
        cardinality > 1 && cardinality <= MAX_SUGGESTED_FACET_CARDINALITY && cardinality < total;
      return isUseful ? [{ field: name, cardinality }] : [];
    });
    return { total, useful };
  });

  async function runRows(defaultColumns: readonly string[]) {
    const rowsQuery = buildRowsQuery(
      index,
      body,
      fields,
      Math.min(body.from + body.size, MAX_RESULT_WINDOW),
      defaultColumns
    );
    const result = await runEsql({
      esClient,
      body: rowsQuery.esql,
      dropNullColumns: rowsQuery.keep.length === 0,
    });
    return { rowsQuery, result };
  }

  const timeField = findTimeField(fields);
  const rowsPromise = needsDefaultColumns
    ? statsPromise.then(({ useful }) =>
        runRows(
          [...(timeField ? [timeField] : []), ...useful.map(({ field }) => field)].slice(
            0,
            MAX_DEFAULT_COLUMNS
          )
        )
      )
    : runRows(configuredColumns);

  const [{ total, useful }, { rowsQuery, result }, ...facetResults] = await Promise.all([
    statsPromise,
    rowsPromise,
    ...body.facets.map((field) =>
      runEsql({
        esClient,
        body: {
          query: [
            base,
            `| STATS ${COUNT_COLUMN} = COUNT(*) BY ${quoteIdentifier(field)}`,
            `| SORT ${COUNT_COLUMN} DESC`,
            `| LIMIT ${body.facetSize}`,
          ].join('\n'),
          params,
        },
      })
    ),
  ]);

  return {
    total,
    columns: displayColumns(result.columns, rowsQuery.keep),
    rows: toDocumentRows(result).slice(body.from),
    facets: body.facets.map((field, position) =>
      toFacetResult(field, facetResults[position], total)
    ),
    suggestedFacets: body.suggestFacets
      ? useful.filter(({ field }) => !body.facets.includes(field))
      : [],
    sort: rowsQuery.sort,
    esql: rowsQuery.esql,
  };
}

/** Runs the table view's ES|QL query with a larger limit for export. */
export async function exportIndex({
  esClient,
  index,
  body,
  maxRows,
}: {
  esClient: ElasticsearchClient;
  index: string;
  body: QueryState;
  maxRows: number;
}): Promise<EsqlResponse> {
  const fields = await getFields(esClient, index);
  const { esql, keep } = buildRowsQuery(index, body, fields, maxRows);
  const result = await runEsql({ esClient, body: esql, dropNullColumns: keep.length === 0 });
  if (keep.length === 0) {
    return result;
  }
  const positions = displayColumns(result.columns, keep).map((column) =>
    result.columns.indexOf(column)
  );
  return {
    ...result,
    columns: positions.map((position) => result.columns[position]),
    values: result.values.map((row) => positions.map((position) => row[position])),
  };
}

/** Fetches one document by `_id` with ES|QL, including its `_source`. */
export async function getDocument({
  esClient,
  index,
  id,
}: {
  esClient: ElasticsearchClient;
  index: string;
  id: string;
}): Promise<GetDocumentResponse | undefined> {
  const esql: EsqlRequestBody = {
    query: [
      `FROM ${toSource(index)} METADATA _id, _index, _source`,
      '| WHERE _id == ?id',
      '| LIMIT 1',
    ].join('\n'),
    params: [{ name: 'id', type: 'string', value: id }],
  };
  const result = await runEsql({ esClient, body: esql, dropNullColumns: true });
  const [row] = toDocumentRows(result);
  if (!row) {
    return undefined;
  }
  const sourcePosition = result.columns.findIndex(({ name }) => name === '_source');
  const source = sourcePosition >= 0 ? result.values[0][sourcePosition] : null;
  return { ...row, source, esql };
}
