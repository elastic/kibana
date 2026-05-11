/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';

/**
 * Dynamic templates applied to the `.cases` analytics index mapping.
 *
 * Two subtrees of the document have dynamic children whose names aren't known
 * at mapping time:
 *
 * 1. `cases.extended_fields.*` — typed extended fields declared by templates
 *    (`<name>_as_<type>`). At the index level every child is keyword. Typed
 *    querying happens via runtime fields published at `cases.<snake>` — see
 *    `data_view/runtime_fields.ts` (added in a later commit).
 *
 * 2. `cases.observables.*` — denormalized observables, one keyword array per
 *    `typeKey`. The case SO stores observables as a nested array of
 *    `{ typeKey, value, description }` triples; the doc-builder regroups them
 *    so each observable type lives at its own path
 *    (e.g. `cases.observables.url: ["http://..."]`). This preserves the
 *    type↔value relationship via the field path while enabling simple term
 *    queries like `cases.observables.url: "http://..."`.
 *
 * Both subtrees indexes children as keyword via `ignore_above: 32766` — the
 * standard cap for keyword fields. Values above that length are dropped from
 * the index but kept in the source document, which prevents pathologically
 * large user-entered values from blowing up the inverted index.
 *
 * **Why keyword for both subtrees?**
 * - Exact match + term aggregations work out of the box.
 * - No risk of a malformed user value (e.g. a non-numeric string in a
 *   `_as_long` extended field) failing the index write and silently dropping
 *   the doc.
 * - Typed comparison operators come via runtime fields at query time where
 *   relevant (see the extended-fields lift); for observables, keyword
 *   semantics match the SO's `value` field type exactly.
 */
export const CASE_DYNAMIC_TEMPLATES: Array<Record<string, MappingDynamicTemplate>> = [
  {
    extended_fields_keyword: {
      path_match: 'cases.extended_fields.*',
      mapping: {
        type: 'keyword',
        ignore_above: 32766,
      },
    },
  },
  {
    observables_keyword: {
      path_match: 'cases.observables.*',
      mapping: {
        type: 'keyword',
        ignore_above: 32766,
      },
    },
  },
];
