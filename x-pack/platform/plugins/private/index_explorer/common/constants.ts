/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'indexExplorer';
export const PLUGIN_NAME = 'Index Explorer';

export const API_BASE_PATH = '/internal/index_explorer';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;

/** Matches the default `index.max_result_window`; from + size must stay at or below it. */
export const MAX_RESULT_WINDOW = 10000;

export const DEFAULT_FACET_SIZE = 10;
export const MAX_FACET_SIZE = 100;
export const MAX_FACETS = 20;
export const MAX_FILTERS = 50;
export const MAX_COLUMNS = 500;
/** Columns shown by default: the time field plus fields that qualify as suggested facets. */
export const MAX_DEFAULT_COLUMNS = 12;
export const MAX_SUGGESTED_FACET_CANDIDATES = 200;
export const MAX_SUGGESTED_FACET_CARDINALITY = 100;
/** Fields with at most this many distinct values get a value picker in the filter bar. */
export const MAX_FIELD_VALUE_OPTIONS = 100;

export const MAX_INDEX_NAME_LENGTH = 1000;
export const MAX_FIELD_NAME_LENGTH = 1000;
export const MAX_VALUE_LENGTH = 10000;
export const MAX_QUERY_LENGTH = 100000;
export const MAX_ESQL_PARAMS = 50;
