/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isObject } from 'lodash';
import type { EnhancedFieldMetaData } from './use_get_fields';

export function formFieldToResilientFieldValue(
  value: unknown,
  fieldMetadata: EnhancedFieldMetaData
) {
  // Dates need to be sent to the resilient API as numbers
  if (
    isObject(value) &&
    'toDate' in value &&
    typeof value.toDate === 'function' &&
    (fieldMetadata.input_type === 'datetimepicker' || fieldMetadata.input_type === 'datepicker')
  ) {
    // DatePickerFields return Moment objects but resilient expects numbers
    return value.toDate().getTime();
  } else if (typeof value === 'string' && fieldMetadata.input_type === 'select') {
    // SelectFields return strings but resilient expects numbers
    return Number(value);
  } else if (Array.isArray(value) && fieldMetadata.input_type === 'multiselect') {
    // MultiSelectFields return string[] but resilient expects number[]
    return value.map((v) => Number(v));
  } else if (typeof value === 'string' && fieldMetadata.input_type === 'number') {
    return Number(value);
  } else {
    return value;
  }
}
