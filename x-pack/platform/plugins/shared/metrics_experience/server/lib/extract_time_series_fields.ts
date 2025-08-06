/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

export function extractTimeSeriesFields(
  fields: Record<string, Record<string, FieldCapsFieldCapability>>
) {
  const numericTypes = [
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'scaled_float',
    'unsigned_long',
    'histogram',
  ];

  const timeSeriesFields: Array<{
    fieldName: string;
    type: string;
    typeInfo: FieldCapsFieldCapability;
    fieldType: 'metric' | 'dimension';
  }> = [];

  for (const [fieldName, fieldInfo] of Object.entries(fields)) {
    if (fieldName === '_doc_count' || fieldName.startsWith('_')) continue;

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
