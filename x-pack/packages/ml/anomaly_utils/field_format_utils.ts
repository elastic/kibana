/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';

// Utility for returning the FieldFormat from a full populated Kibana index pattern object
// containing the list of fields by name with their formats.
export function getFieldFormatFromIndexPattern(
  fullIndexPattern: DataView,
  fieldName: string,
  esAggName: string
): FieldFormat | undefined {
  // Don't use the field formatter for distinct count detectors as
  // e.g. distinct_count(clientip) should be formatted as a count, not as an IP address.
  let fieldFormat;
  if (esAggName !== 'cardinality') {
    const fieldList = fullIndexPattern.fields;
    const field = fieldList.getByName(fieldName);
    if (field !== undefined) {
      fieldFormat = fullIndexPattern.getFormatterForField(field);
    }
  }

  return fieldFormat;
}
