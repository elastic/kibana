/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';

/**
 * Extended template fields land under `cases.extended_fields.<name>.value_<type>` so each
 * field has a concrete typed sub-field. This avoids `flattened` (which is opaque to ES|QL
 * today) and runtime-field workarounds. New types declared on a template are picked up by
 * the template-fields sync service which appends additional dynamic templates as needed.
 *
 * Naming-by-suffix rather than naming-by-path keeps the template list bounded: regardless
 * of how many extended fields a tenant declares, there are exactly four templates.
 */
export const EXTENDED_FIELDS_DYNAMIC_TEMPLATES: Array<Record<string, MappingDynamicTemplate>> = [
  {
    cases_extended_fields_keyword: {
      path_match: 'cases.extended_fields.*.value_keyword',
      mapping: { type: 'keyword' },
    },
  },
  {
    cases_extended_fields_long: {
      path_match: 'cases.extended_fields.*.value_long',
      mapping: { type: 'long' },
    },
  },
  {
    cases_extended_fields_double: {
      path_match: 'cases.extended_fields.*.value_double',
      mapping: { type: 'double' },
    },
  },
  {
    cases_extended_fields_date: {
      path_match: 'cases.extended_fields.*.value_date',
      mapping: { type: 'date' },
    },
  },
];
