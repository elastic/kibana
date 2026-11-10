/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FILTER_OPERATORS = [
  'exact',
  'not',
  'contains',
  'startswith',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notin',
  'exists',
  'missing',
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/** Operators that take no value. */
export const VALUELESS_OPERATORS: readonly FilterOperator[] = ['exists', 'missing'];

/** ES|QL column types that can be grouped with `STATS ... BY`, for facets and value pickers. */
export const FACETABLE_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'boolean',
  'ip',
  'version',
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'date',
  'date_nanos',
]);

export interface Filter {
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value: string;
}

export type SortDirection = 'asc' | 'desc';

export interface Sort {
  readonly field: string;
  readonly direction: SortDirection;
}

export type ExportFormat = 'csv' | 'json';

export type IndexKind = 'index' | 'data_stream' | 'alias';

export interface IndexSummary {
  readonly name: string;
  readonly kind: IndexKind;
  readonly docsCount?: number;
  readonly title?: string;
  readonly description?: string;
}

export interface ListIndicesResponse {
  readonly indices: IndexSummary[];
}

/** A column as reported by ES|QL. */
export interface FieldInfo {
  readonly name: string;
  readonly type: string;
}

export interface GetFieldsResponse {
  readonly fields: FieldInfo[];
}

export interface SearchRequestBody {
  readonly filters: Filter[];
  readonly search?: string;
  readonly sort?: Sort;
  /** Columns to show, in order (`_col`); when empty all columns are shown. */
  readonly columns?: string[];
  /** Columns to hide (`_nocol`); ignored when `columns` is set. */
  readonly hiddenColumns?: string[];
  readonly from: number;
  readonly size: number;
  readonly facets: string[];
  readonly facetSize: number;
  readonly suggestFacets: boolean;
}

export type FieldValue = string | number | boolean | null | FieldValue[] | object;

export interface DocumentRow {
  readonly _id: string;
  readonly _index: string;
  readonly values: Record<string, FieldValue>;
}

export interface FacetBucket {
  /** The bucket key as a string, suitable for use as an `exact` filter value. */
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface HistogramBucket {
  /** Bucket start, in epoch milliseconds. */
  readonly timestamp: number;
  readonly count: number;
}

export interface HistogramResponse {
  /** The time field charted; absent when the index has no `@timestamp`. */
  readonly field?: string;
  readonly intervalMs?: number;
  readonly buckets: HistogramBucket[];
  readonly esql?: EsqlRequestBody;
}

export interface FieldValuesResponse {
  /** Distinct values sorted by value; empty unless `complete`. */
  readonly values: FacetBucket[];
  /** True when the field has few enough distinct values to offer as a picker. */
  readonly complete: boolean;
}

export interface FacetResult {
  readonly field: string;
  readonly buckets: FacetBucket[];
  readonly otherCount: number;
}

export interface SuggestedFacet {
  readonly field: string;
  readonly cardinality: number;
}

export interface SearchResponse {
  readonly total: number;
  readonly columns: EsqlColumn[];
  readonly rows: DocumentRow[];
  readonly facets: FacetResult[];
  readonly suggestedFacets: SuggestedFacet[];
  /** The sort actually applied, which defaults to @timestamp when present. */
  readonly sort?: Sort;
  /** The ES|QL query that produced the rows. */
  readonly esql: EsqlRequestBody;
}

export interface GetDocumentResponse {
  readonly _id: string;
  readonly _index: string;
  readonly source: FieldValue;
  readonly values: Record<string, FieldValue>;
  readonly esql: EsqlRequestBody;
}

export type EsqlParamType = 'string' | 'number' | 'boolean';

export interface EsqlParam {
  readonly name: string;
  readonly type: EsqlParamType;
  readonly value: string;
}

export interface EsqlRequestBody {
  readonly query: string;
  readonly params: EsqlParam[];
}

export interface EsqlColumn {
  readonly name: string;
  readonly type: string;
}

export interface EsqlResponse {
  readonly took?: number;
  readonly isPartial: boolean;
  readonly columns: EsqlColumn[];
  readonly values: FieldValue[][];
}

export interface CannedQueryParam {
  readonly name: string;
  readonly type: EsqlParamType;
  readonly defaultValue?: string;
}

export interface CannedQuery {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly query: string;
  readonly params: CannedQueryParam[];
}

export interface IndexMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly facets: string[];
  readonly columns: string[];
}

export interface MetadataResponse {
  readonly title?: string;
  readonly description?: string;
  readonly queries: CannedQuery[];
  readonly indices: Record<string, IndexMetadata>;
}
