/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';

/**
 * Dynamic templates for `cases.extended_fields.*`.
 *
 * Cases templates can declare typed extended fields via snake-keys of the form
 * `<name>_as_<type>` (e.g. `riskScore_as_long`, `incidentDate_as_date`). At the
 * **index** level, every child of `cases.extended_fields` is stored as a
 * keyword regardless of declared type. Typed querying happens via runtime
 * fields published at `cases.<snake>` — see `data_view/runtime_fields.ts`
 * (added in a later commit) for the lift.
 *
 * Why keyword everywhere?
 * - Exact match + term aggregations work out of the box.
 * - No risk of a malformed user value (e.g. a non-numeric string in a
 *   `_as_long` field) failing the index write and silently dropping the doc.
 * - The runtime field handles the typed comparison operators (range, date
 *   parsing, boolean conversion) at query time.
 *
 * `ignore_above: 32766` is the standard cap for keyword fields — values above
 * that length are dropped from the index but kept in the source document. This
 * prevents pathologically large extended-field values from blowing up the
 * inverted index.
 */
export const EXTENDED_FIELDS_DYNAMIC_TEMPLATES: Array<Record<string, MappingDynamicTemplate>> = [
  {
    extended_fields_keyword: {
      path_match: 'cases.extended_fields.*',
      mapping: {
        type: 'keyword',
        ignore_above: 32766,
      },
    },
  },
];
