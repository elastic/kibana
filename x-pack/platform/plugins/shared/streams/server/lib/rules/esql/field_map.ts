/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap } from '@kbn/alerts-as-data-utils';
import type { FieldMap } from '@kbn/alerts-as-data-utils';

type WellKnownFieldEntry = { path: string } & FieldMap[string];

/**
 * Well-known fields under `original_source` that should be mapped so they are
 * indexed and queryable/sortable/filterable. Add a new entry here to extend
 * the ES|QL rule alert mappings.
 */
const WELL_KNOWN_FIELDS: WellKnownFieldEntry[] = [
  { path: 'host.hostname', type: 'keyword', required: false },
  { path: 'service.name', type: 'keyword', required: false },
];

function buildWellKnownFieldsMap(): FieldMap {
  const fieldMap: FieldMap = {};
  for (const { path, ...fieldDef } of WELL_KNOWN_FIELDS) {
    fieldMap[`original_source.${path}`] = fieldDef;
  }
  return fieldMap;
}

export const esqlRuleFieldMap: FieldMap = {
  ...alertFieldMap,
  ...buildWellKnownFieldsMap(),
};
