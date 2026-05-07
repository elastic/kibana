/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingDynamicTemplate } from '@elastic/elasticsearch/lib/api/types';

/**
 * Extended template fields are stored under `cases.extended_fields.<name>_as_<type>`
 * — the writer copies the SO `extended_fields` map verbatim. The map keys encode
 * declared type via the `_as_<type>` suffix (see
 * `common/utils/template_fields.ts#getFieldSnakeKey`), so the index just needs to
 * keep every entry as keyword for exact-match KQL and storage.
 *
 * Type-aware querying happens at the data view layer: the data view sync service
 * adds a runtime field per non-keyword suffix that shadows the indexed keyword
 * path with the correct ES runtime type (parsed via painless). See
 * `cases_analytics/data_view/`.
 */
export const EXTENDED_FIELDS_DYNAMIC_TEMPLATES: Array<Record<string, MappingDynamicTemplate>> = [
  {
    cases_extended_fields_keyword: {
      path_match: 'cases.extended_fields.*',
      mapping: { type: 'keyword' },
    },
  },
];
