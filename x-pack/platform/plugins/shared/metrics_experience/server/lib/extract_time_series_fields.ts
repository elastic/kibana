/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';
import { FILTER_OUT_EXACT_FIELDS_FOR_CONTENT } from '@kbn/discover-utils';
import { ES_FIELD_TYPES } from '@kbn/field-types';

export function extractTimeSeriesFields(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  const numericTypes = [
    ES_FIELD_TYPES.LONG,
    ES_FIELD_TYPES.INTEGER,
    ES_FIELD_TYPES.SHORT,
    ES_FIELD_TYPES.BYTE,
    ES_FIELD_TYPES.DOUBLE,
    ES_FIELD_TYPES.FLOAT,
    ES_FIELD_TYPES.HALF_FLOAT,
    ES_FIELD_TYPES.SCALED_FLOAT,
    ES_FIELD_TYPES.UNSIGNED_LONG,
    ES_FIELD_TYPES.HISTOGRAM,
  ];

  const timeSeriesFields: Array<{
    fieldName: string;
    type: string;
    typeInfo: FieldCapsFieldCapability;
    fieldType: 'metric' | 'dimension';
  }> = [];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    if (FILTER_OUT_EXACT_FIELDS_FOR_CONTENT.includes(fieldName)) continue;

    for (const [type, typeInfo] of Object.entries(fieldInfo)) {
      // Check for time series metrics (numeric fields with time_series_metric)
      if (numericTypes.includes(type) && typeInfo.time_series_metric) {
        timeSeriesFields.push({ fieldName, type, typeInfo, fieldType: 'metric' });
      }
      // Check for time series dimensions
      else if (typeInfo.time_series_dimension === true) {
        timeSeriesFields.push({ fieldName, type, typeInfo, fieldType: 'dimension' });
      }
    }
  }

  return timeSeriesFields;
}
