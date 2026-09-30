/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { buildSoSearch } from '../build_so_search';

import { mergedBuilderFieldMappings } from '../../saved_objects/rule_mappings';

/**
 * Fields searched via the SO client's `search` / `searchFields` params
 * (simple_query_string). Only `text`-mapped fields can be listed here —
 * simple_query_string with a trailing `*` creates phrase-prefix queries,
 * which Elasticsearch rejects on keyword fields.
 *
 * `metadata.tags` and `grouping.fields` are keyword-only and therefore
 * excluded. To add keyword-field search in the future, add a `text`
 * sub-field to their mapping and reference it here.
 *
 * The `metadata.builder_fields.*` entries are derived from the registered
 * manifests' `text` leaves rather than hand-listed: any leaf declared as
 * `text` in `mergedBuilderFieldMappings` joins the search. This makes a `text`
 * sub-field (note, setup, query) searchable from the moment its manifest ships,
 * without a separate change to this file.
 *
 * Ref: builder-type-registration-redesign.md "What this design needs from the framework"
 */
export const RULE_SEARCH_FIELDS: string[] = [
  'metadata.name',
  'metadata.description',
  ...Object.entries(mergedBuilderFieldMappings)
    .filter(([, mapping]) => mapping.type === 'text')
    .map(([path]) => `metadata.builder_fields.${path}`),
];
