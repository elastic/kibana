/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { Field } from '@kbn/ml-anomaly-utils';

export interface EsqlColumn {
  readonly name: string;
  readonly type: string;
}

// ES|QL column types that can be used by an anomaly detection job, and the field type
// whose aggregations they offer. Other types, e.g. unsupported or null, are left out.
const ESQL_TYPE_TO_FIELD_TYPE: Readonly<Record<string, ES_FIELD_TYPES>> = {
  boolean: ES_FIELD_TYPES.BOOLEAN,
  date: ES_FIELD_TYPES.DATE,
  date_nanos: ES_FIELD_TYPES.DATE,
  double: ES_FIELD_TYPES.DOUBLE,
  integer: ES_FIELD_TYPES.INTEGER,
  long: ES_FIELD_TYPES.LONG,
  unsigned_long: ES_FIELD_TYPES.UNSIGNED_LONG,
  counter_double: ES_FIELD_TYPES.DOUBLE,
  counter_integer: ES_FIELD_TYPES.INTEGER,
  counter_long: ES_FIELD_TYPES.LONG,
  keyword: ES_FIELD_TYPES.KEYWORD,
  text: ES_FIELD_TYPES.TEXT,
  ip: ES_FIELD_TYPES.IP,
  version: ES_FIELD_TYPES.VERSION,
  geo_point: ES_FIELD_TYPES.GEO_POINT,
  geo_shape: ES_FIELD_TYPES.GEO_SHAPE,
};

/** Converts the output columns of an ES|QL query into job fields, sorted by name. */
export const esqlColumnsToFields = (columns: readonly EsqlColumn[]): Field[] =>
  columns
    .flatMap(({ name, type }): Field[] => {
      const fieldType = ESQL_TYPE_TO_FIELD_TYPE[type];
      if (fieldType === undefined) {
        return [];
      }
      return [
        {
          id: name,
          name,
          type: fieldType,
          // every ES|QL output column can be aggregated by a later STATS command
          aggregatable: true,
          counter: type.startsWith('counter_'),
          aggs: [],
        },
      ];
    })
    .sort((a, b) => a.id.localeCompare(b.id));
