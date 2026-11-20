/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import {
  KI_NOT_DELETED_STATUSES,
  toOptionalKiStatus,
  type KiStatus,
} from '../../common/ki_lifecycle_status';
import { DEFAULT_KI_LIST_SORT, type KiListSort } from '../../common/ki_list_sort';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { KI_HISTOGRAM_DAYS, MAX_KI_TYPE_FILTER_LENGTH } from '../../common/constants';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type {
  KiGroup,
  KiHistogramBucket,
  KiHistogramResponse,
  KiListItem,
  ListKiGroupsResponse,
  ListKisResponse,
} from '../../common/http_api/knowledge_indicators';

const KI_LIFECYCLE_STATUS_FIELD = 'governance.lifecycle.status';
/** Normalized lifecycle column: unset stored values become `active`. */
const KI_LIFECYCLE_STATUS_ALIAS = 'lifecycle_status';
export const KI_STATUS_ALIAS = 'ki_status';

/** Columns the list reads. Each is guarded by a schema probe since AI indices vary in shape. */
const KI_LIST_FIELDS = [
  'id',
  '@timestamp',
  'updated_at',
  'type',
  'title',
  'description',
  'expires_at',
  KI_LIFECYCLE_STATUS_FIELD,
] as const;
type KiListField = (typeof KI_LIST_FIELDS)[number];

export interface GetKisOptions {
  dest: AiIndexDest;
  size: number;
  type?: string;
  /** Fuzzy full-text search over indexed title and description columns. */
  query?: string;
  /** When omitted, non-deleted KIs only (unset status counts as active). */
  statuses?: KiStatus[];
  sort?: KiListSort;
  /** Leaves out KIs of these types. KIs without a type stay in. */
  excludeTypes?: string[];
}

export interface GetKiGroupsOptions {
  dest: AiIndexDest;
  maxGroups: number;
  /**
   * When set, exactly these types are the groups (a type with no match is left out) and
   * `maxGroups` is ignored. Lets a client keep the same groups while the search changes.
   */
  types?: string[];
  /** Leaves out KIs of these types before grouping. KIs without a type stay in. */
  excludeTypes?: string[];
  previewSize: number;
  query?: string;
  statuses?: KiStatus[];
  sort?: KiListSort;
}

const EMPTY: ListKisResponse = { kis: [], total: 0, summary: { total: 0, counts_by_type: [] } };
const EMPTY_GROUPS: ListKiGroupsResponse = { total: 0, total_other: 0, groups: [] };

const KEEP_FIELDS = [
  '_index',
  'id',
  'type',
  'title',
  'updated_at',
  'expires_at',
  KI_STATUS_ALIAS,
].join(', ');

/**
 * A type that can be a group. A longer type can't be sent back as a `type` or
 * `exclude_types` filter, so it stays in "Other". UTF-8 bytes are never fewer than the
 * UTF-16 units the request schema counts, so every groupable type passes that schema.
 */
const GROUPABLE_TYPE_CONDITION = `type IS NOT NULL AND BYTE_LENGTH(type) <= ${MAX_KI_TYPE_FILTER_LENGTH}`;

const excludeTypeParam = (i: number): string => `excludeType${i}`;
const groupTypeParam = (i: number): string => `groupType${i}`;

/**
 * KIs outside the given types. `IS NULL` keeps KIs without a type: `NOT IN` on null is null.
 * Types longer than the filter limit are never in `excludeTypes`, so they always match.
 */
const otherTypesCondition = (excludeTypes: string[]): string =>
  `(type IS NULL OR type NOT IN (${excludeTypes
    .map((_, i) => `?${excludeTypeParam(i)}`)
    .join(', ')}))`;

const toRecords = (response: ESQLSearchResponse): Array<Record<string, unknown>> =>
  response.values.map((row) =>
    Object.fromEntries(response.columns.map((column, i) => [column.name, row[i]]))
  );

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toKiListItem = (row: Record<string, unknown>): KiListItem => {
  const { _index: index, id, type, title, updated_at: updatedAt, expires_at: expiresAt } = row;
  const updatedAtValue = toOptionalString(updatedAt);
  const expiresAtValue = toOptionalString(expiresAt);
  const status = toOptionalKiStatus(row[KI_STATUS_ALIAS]) ?? 'active';
  const typeValue = toOptionalString(type);
  return {
    id: String(id),
    index: String(index),
    ...(typeValue !== undefined ? { type: typeValue } : {}),
    ...(typeof title === 'string' ? { title } : {}),
    ...(updatedAtValue !== undefined ? { updated_at: updatedAtValue } : {}),
    ...(expiresAtValue !== undefined ? { expires_at: expiresAtValue } : {}),
    status,
  };
};

export const lifecycleStatusEvalClause = (has: (field: KiListField) => boolean): string =>
  has(KI_LIFECYCLE_STATUS_FIELD)
    ? `EVAL ${KI_LIFECYCLE_STATUS_ALIAS} = COALESCE(${KI_LIFECYCLE_STATUS_FIELD}, "active")`
    : `EVAL ${KI_LIFECYCLE_STATUS_ALIAS} = "active"`;

export const kiStatusEvalClause = (has: (field: KiListField) => boolean): string => {
  const expired = has('expires_at') ? 'expires_at <= NOW()' : 'false';
  return `EVAL ${KI_STATUS_ALIAS} = CASE(${KI_LIFECYCLE_STATUS_ALIAS} == "active" AND COALESCE(${expired}, false), "expired", ${KI_LIFECYCLE_STATUS_ALIAS})`;
};

const statusFilterClause = (statuses?: KiStatus[]): string[] => {
  if (statuses === undefined) {
    return [`WHERE ${KI_LIFECYCLE_STATUS_ALIAS} != "deleted"`];
  }
  if (statuses.length === 0) {
    return ['WHERE FALSE'];
  }
  const values = statuses.map((status) => `"${status}"`).join(', ');
  return [`WHERE ${KI_STATUS_ALIAS} IN (${values})`];
};

const searchFilterClause = (has: (field: KiListField) => boolean, query?: string): string[] => {
  if (query === undefined) {
    return [];
  }
  const matches: string[] = [];
  if (has('title')) {
    matches.push('MATCH(title, ?searchQuery, {"fuzziness":"AUTO", "boost": 2})');
  }
  if (has('description')) {
    matches.push('MATCH(description, ?searchQuery, {"fuzziness":"AUTO"})');
  }
  if (matches.length === 0) {
    return ['WHERE FALSE'];
  }
  return [`WHERE (${matches.join(' OR ')})`];
};

/** User input goes into ES|QL only as named params. */
const listQueryParams = ({
  type,
  query,
  excludeTypes = [],
}: {
  type?: string;
  query?: string;
  excludeTypes?: string[];
}): { params?: Array<Record<string, string>> } => {
  const params: Array<Record<string, string>> = [];
  if (type !== undefined) {
    params.push({ type });
  }
  if (query !== undefined) {
    params.push({ searchQuery: query });
  }
  excludeTypes.forEach((excludeType, i) => params.push({ [excludeTypeParam(i)]: excludeType }));
  return params.length > 0 ? { params } : {};
};

/** The row filter of a list request, or undefined when there is none. */
const listFilterCondition = (type?: string, excludeTypes: string[] = []): string | undefined => {
  const conditions = [
    ...(type !== undefined ? ['type == ?type'] : []),
    ...(excludeTypes.length > 0 ? [otherTypesCondition(excludeTypes)] : []),
  ];
  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
};

/** A dest value may be a comma-separated list of index expressions. */
const destExpressions = (destValue: string): string[] =>
  destValue
    .split(',')
    .map((expression) => expression.trim())
    .filter((expression) => expression.length > 0);

const fromSources = (expressions: string[]): string =>
  expressions.map((expression) => JSON.stringify(expression)).join(', ');

const probeQuery = (expression: string): string =>
  `FROM ${JSON.stringify(expression)} METADATA _id, _index\n| LIMIT 0`;

/** The mapped columns of one index expression, or undefined when it resolves to nothing. */
export const probeColumns = async (
  esClient: ElasticsearchClient,
  expression: string,
  options?: { requestTimeout?: number }
): Promise<string[] | undefined> => {
  try {
    const probe = await esClient.esql.query({ query: probeQuery(expression) }, options);
    return (probe as unknown as ESQLSearchResponse).columns.map(({ name }) => name);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};

/**
 * "Recently updated" order: `updated_at` (the date the UI shows), else the revision `@timestamp`.
 * In-place edits, deletes and restores on an index dest change only `updated_at`.
 */
const getUpdatedSort = (
  has: (field: KiListField) => boolean
): { evalClauses: string[]; sortKeys: string[] } => {
  if (has('updated_at') && has('@timestamp')) {
    return {
      evalClauses: ['EVAL updated_sort = COALESCE(TO_DATETIME(updated_at), revision_time)'],
      sortKeys: ['updated_sort DESC'],
    };
  }
  if (has('updated_at')) {
    return {
      evalClauses: ['EVAL updated_sort = TO_DATETIME(updated_at)'],
      sortKeys: ['updated_sort DESC NULLS LAST'],
    };
  }
  return { evalClauses: [], sortKeys: has('@timestamp') ? ['revision_time DESC'] : [] };
};

/**
 * A search ranks by best match first; the chosen sort only breaks score ties.
 * ES|QL sorts `text` case-sensitively, and an empty title sorts first unless nulled.
 */
const getRowsSort = (
  sort: KiListSort,
  has: (field: KiListField) => boolean,
  query: string | undefined
): string[] => {
  const scoreKeys = query !== undefined ? ['_score DESC'] : [];
  if (sort === 'title') {
    return [
      'EVAL title_sort = CASE(title == "", NULL, TO_LOWER(title))',
      `SORT ${[...scoreKeys, 'title_sort ASC NULLS LAST', 'id ASC'].join(', ')}`,
    ];
  }
  const { evalClauses, sortKeys } = getUpdatedSort(has);
  return [...evalClauses, `SORT ${[...scoreKeys, ...sortKeys, 'id ASC'].join(', ')}`];
};

export interface LatestRevisionOptions {
  /** Also keeps `first_seen`: the oldest revision `@timestamp` of each KI, null when none has one. */
  firstSeen?: boolean;
}

/**
 * Keeps only the latest revision by `@timestamp` for each logical id.
 * On an index dest the same id may exist in several backing indices, so those are distinct KIs.
 * Documents without a timestamp sort first, and `_id` breaks timestamp ties.
 */
export const latestRevisionPipeline = (
  dest: AiIndexDest,
  has: (field: 'id' | '@timestamp') => boolean,
  { firstSeen = false }: LatestRevisionOptions = {}
): string[] => {
  const key = dest.type === 'data_stream' ? 'id' : '_index, id';
  // `@timestamp`, not `revision_time`: one revision without a timestamp must not make it 1970.
  const firstSeenStat = firstSeen ? ', first_seen = MIN(@timestamp)' : '';
  return [
    has('id') ? 'EVAL id = COALESCE(id, _id)' : 'EVAL id = _id',
    ...(has('@timestamp')
      ? [
          'EVAL revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
          `INLINE STATS latest = MAX(revision_time)${firstSeenStat} BY ${key}`,
          'WHERE revision_time == latest',
          `INLINE STATS latest_doc = MAX(_id) BY ${key}`,
          'WHERE _id == latest_doc',
        ]
      : []),
  ];
};

/**
 * One `type` per KI, so groups, type filters and "Other" agree: a multi-value type keeps its
 * lowest value, and an empty type means no type.
 */
const normalizedTypeClauses = (has: (field: KiListField) => boolean): string[] =>
  has('type')
    ? ['EVAL type = MV_MIN(type)', 'EVAL type = CASE(type == "", NULL, type)']
    : ['EVAL type = TO_STRING(NULL)'];

/** One row per KI, filtered by status. */
const currentKisQuery = (
  dest: AiIndexDest,
  sources: string[],
  has: (field: KiListField) => boolean,
  statuses?: KiStatus[],
  query?: string,
  revisionOptions?: LatestRevisionOptions
): string =>
  [
    `FROM ${fromSources(sources)} ${
      query !== undefined ? 'METADATA _id, _index, _score' : 'METADATA _id, _index'
    }`,
    ...latestRevisionPipeline(dest, has, revisionOptions),
    lifecycleStatusEvalClause(has),
    kiStatusEvalClause(has),
    ...statusFilterClause(statuses),
    ...searchFilterClause(has, query),
    ...normalizedTypeClauses(has),
    ...(has('title') ? [] : ['EVAL title = TO_STRING(NULL)']),
    ...(has('updated_at') ? [] : ['EVAL updated_at = TO_STRING(NULL)']),
    ...(has('expires_at') ? [] : ['EVAL expires_at = TO_STRING(NULL)']),
  ].join('\n| ');

interface CurrentKisContext {
  /** The `currentKisQuery` pipeline, ready for more commands. */
  base: string;
  has: (field: KiListField) => boolean;
}

/**
 * Probes the dest columns and builds the shared base query.
 * Undefined when no expression of the dest resolves to an index.
 */
const prepareCurrentKis = async (
  esClient: ElasticsearchClient,
  dest: AiIndexDest,
  statuses?: KiStatus[],
  query?: string,
  revisionOptions?: LatestRevisionOptions
): Promise<CurrentKisContext | undefined> => {
  // Zero-row probes resolve the mapped columns under the caller's own read privilege; an
  // expression that resolves to nothing is left out so the rest of the dest still lists.
  const expressions = destExpressions(dest.value);
  const probes = await Promise.all(
    expressions.map(async (expression) => ({
      expression,
      columns: await probeColumns(esClient, expression),
    }))
  );
  const sources = probes.filter(({ columns }) => columns !== undefined);
  if (sources.length === 0) {
    return undefined;
  }
  const columns = new Set(sources.flatMap(({ columns: names }) => names ?? []));
  const has = (field: KiListField) => columns.has(field);
  const base = currentKisQuery(
    dest,
    sources.map(({ expression }) => expression),
    has,
    statuses,
    query,
    revisionOptions
  );
  return { base, has };
};

const rowsQueryText = (
  { base, has }: CurrentKisContext,
  {
    filter,
    sort,
    query,
    size,
  }: { filter: string | undefined; sort: KiListSort; query: string | undefined; size: number }
): string =>
  [
    base,
    ...(filter !== undefined ? [`WHERE ${filter}`] : []),
    ...getRowsSort(sort, has, query),
    `KEEP ${KEEP_FIELDS}`,
    `LIMIT ${size}`,
  ].join('\n| ');

const toKiListItems = (response: unknown): KiListItem[] =>
  toRecords(response as ESQLSearchResponse).map(toKiListItem);

export const getKis = async (
  esClient: ElasticsearchClient,
  { dest, size, type, query, statuses, sort = DEFAULT_KI_LIST_SORT, excludeTypes }: GetKisOptions
): Promise<ListKisResponse> => {
  const context = await prepareCurrentKis(esClient, dest, statuses, query);
  if (context === undefined) {
    return EMPTY;
  }
  const { base } = context;
  const filter = listFilterCondition(type, excludeTypes);
  const filterParams = listQueryParams({ type, query, excludeTypes });

  const rowsQuery = rowsQueryText(context, { filter, sort, query, size });
  // Exact counts, independent of how many type buckets exist.
  const totalsQuery = [
    base,
    filter !== undefined
      ? `STATS total = COUNT(*), filtered = COUNT(*) WHERE ${filter}`
      : 'STATS total = COUNT(*)',
  ].join('\n| ');
  const bucketsQuery = [
    base,
    `WHERE ${GROUPABLE_TYPE_CONDITION}`,
    'STATS count = COUNT(*) BY type',
    'SORT count DESC, type ASC',
    `LIMIT ${MAX_KI_TYPE_FILTER_COUNT}`,
  ].join('\n| ');
  const bucketsParams = listQueryParams({ query });

  const [rows, totals, buckets] = await Promise.all([
    size > 0 ? esClient.esql.query({ query: rowsQuery, ...filterParams }) : undefined,
    esClient.esql.query({ query: totalsQuery, ...filterParams }),
    esClient.esql.query({ query: bucketsQuery, ...bucketsParams }),
  ]);

  const [totalRow] = toRecords(totals as unknown as ESQLSearchResponse);
  const totalAll = Number(totalRow?.total ?? 0);
  const total = filter === undefined ? totalAll : Number(totalRow?.filtered ?? 0);
  const countsByType = takeTopKiTypeCounts(
    toRecords(buckets as unknown as ESQLSearchResponse).map((row) => ({
      type: String(row.type),
      count: Number(row.count),
    }))
  );

  return {
    kis: rows ? toKiListItems(rows) : [],
    total,
    summary: { total: totalAll, counts_by_type: countsByType },
  };
};

/**
 * The biggest KI types, each with its count and its first KIs, plus the count of all other KIs.
 * Counts come from one query, so `total` is always the sum of the group counts and
 * `total_other`. Rows come after, so writes in between can make them differ by a few KIs.
 */
export const getKiGroups = async (
  esClient: ElasticsearchClient,
  {
    dest,
    maxGroups,
    types,
    excludeTypes = [],
    previewSize,
    query,
    statuses,
    sort = DEFAULT_KI_LIST_SORT,
  }: GetKiGroupsOptions
): Promise<ListKiGroupsResponse> => {
  const context = await prepareCurrentKis(esClient, dest, statuses, query);
  if (context === undefined) {
    return EMPTY_GROUPS;
  }
  const { base } = context;
  const fixedTypes = types !== undefined && types.length > 0 ? types : undefined;

  // With fixed types only they can be a group; the rest joins the null bucket ("Other").
  const groupCondition = fixedTypes
    ? `${GROUPABLE_TYPE_CONDITION} AND type IN (${fixedTypes
        .map((_, i) => `?${groupTypeParam(i)}`)
        .join(', ')})`
    : GROUPABLE_TYPE_CONDITION;
  // Total and top buckets in one query. KIs that can't be a group share the null bucket,
  // sorted last, so the total survives even when no KI has a groupable type.
  // The excluded types are not part of this answer at all: not in the total, not in "Other".
  // The group rows below need no such filter: an excluded type can't be a group.
  const bucketsQuery = [
    base,
    ...(excludeTypes.length > 0 ? [`WHERE ${otherTypesCondition(excludeTypes)}`] : []),
    `EVAL group_type = CASE(${groupCondition}, type, NULL)`,
    'STATS count = COUNT(*) BY group_type',
    'INLINE STATS total = SUM(count)',
    'EVAL is_other = group_type IS NULL',
    'SORT is_other ASC, count DESC, group_type ASC',
    `LIMIT ${fixedTypes ? fixedTypes.length : maxGroups}`,
  ].join('\n| ');
  const bucketsParams = [
    ...(listQueryParams({ query, excludeTypes }).params ?? []),
    ...(fixedTypes ?? []).map((type, i) => ({ [groupTypeParam(i)]: type })),
  ];
  const buckets = toRecords(
    (await esClient.esql.query({
      query: bucketsQuery,
      ...(bucketsParams.length > 0 ? { params: bucketsParams } : {}),
    })) as unknown as ESQLSearchResponse
  );
  const total = Number(buckets[0]?.total ?? 0);
  const groupCounts = buckets.flatMap(({ group_type: type, count }) =>
    typeof type === 'string' ? [{ type, count: Number(count) }] : []
  );
  // The other KIs are the null bucket plus the types past `maxGroups`: the same KIs that
  // `exclude_types` with the group types lists.
  const totalOther = total - groupCounts.reduce((sum, { count }) => sum + count, 0);

  const groupRows = await Promise.all(
    groupCounts.map(({ type }) =>
      esClient.esql.query({
        query: rowsQueryText(context, { filter: 'type == ?type', sort, query, size: previewSize }),
        ...listQueryParams({ type, query }),
      })
    )
  );

  const groups: KiGroup[] = groupCounts.map(({ type, count }, i) => ({
    type,
    count,
    kis: toKiListItems(groupRows[i]),
  }));
  return { total, total_other: totalOther, groups };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The `YYYY-MM-DD` keys of the histogram window: the last `KI_HISTOGRAM_DAYS` UTC days, oldest first. */
export const kiHistogramDays = (now: Date): string[] => {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: KI_HISTOGRAM_DAYS }, (_, i) =>
    new Date(today - (KI_HISTOGRAM_DAYS - 1 - i) * DAY_MS).toISOString().slice(0, 10)
  );
};

/**
 * When a KI was added: its first revision `@timestamp`, else `updated_at`. Checked per KI, since
 * the indices of one dest can differ. Undefined when the dest has neither column.
 */
const addedAtExpression = (has: (field: KiListField) => boolean): string | undefined => {
  if (has('@timestamp') && has('updated_at')) {
    return 'COALESCE(first_seen, TO_DATETIME(updated_at))';
  }
  if (has('@timestamp')) {
    return 'first_seen';
  }
  return has('updated_at') ? 'TO_DATETIME(updated_at)' : undefined;
};

/**
 * Non-deleted KIs added per UTC day over the last `KI_HISTOGRAM_DAYS` days, days without KIs
 * included. Kibana picks the window, so the day keys and the query use the same clock.
 */
export const getKiHistogram = async (
  esClient: ElasticsearchClient,
  { dest, now = new Date() }: { dest: AiIndexDest; now?: Date }
): Promise<KiHistogramResponse> => {
  const days = kiHistogramDays(now);
  const toBuckets = (counts: Map<string, number> = new Map()): KiHistogramResponse => ({
    buckets: days.map((date): KiHistogramBucket => ({ date, count: counts.get(date) ?? 0 })),
  });

  const context = await prepareCurrentKis(esClient, dest, [...KI_NOT_DELETED_STATUSES], undefined, {
    firstSeen: true,
  });
  const addedAt = context !== undefined ? addedAtExpression(context.has) : undefined;
  if (context === undefined || addedAt === undefined) {
    return toBuckets();
  }

  const from = `${days[0]}T00:00:00.000Z`;
  const to = new Date(Date.parse(`${days[days.length - 1]}T00:00:00.000Z`) + DAY_MS).toISOString();
  const histogramQuery = [
    context.base,
    `EVAL added_at = ${addedAt}`,
    'WHERE added_at >= TO_DATETIME(?from) AND added_at < TO_DATETIME(?to)',
    'EVAL day = DATE_TRUNC(1 day, added_at)',
    'STATS count = COUNT(*) BY day',
  ].join('\n| ');
  const response = await esClient.esql.query({
    query: histogramQuery,
    params: [{ from }, { to }],
    // A shard failure must fail the chart, not undercount days.
    allow_partial_results: false,
  });

  const counts = new Map(
    toRecords(response as unknown as ESQLSearchResponse).map(({ day, count }) => [
      String(day).slice(0, 10),
      Number(count),
    ])
  );
  return toBuckets(counts);
};
