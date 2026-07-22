/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { buildSoSearch } from '../build_so_search';

/**
 * Fields searched via the SO client's `search` / `searchFields` params
 * (simple_query_string). Only `text`-mapped fields can be listed here —
 * simple_query_string with a trailing `*` creates phrase-prefix queries,
 * which Elasticsearch rejects on keyword fields.
 *
 * `metadata.tags` and `grouping.fields` are keyword-only and therefore
 * excluded. To add keyword-field search in the future, add a `text`
 * sub-field to their mapping and reference it here.
 */
export const RULE_SEARCH_FIELDS = ['metadata.name', 'metadata.description'];
