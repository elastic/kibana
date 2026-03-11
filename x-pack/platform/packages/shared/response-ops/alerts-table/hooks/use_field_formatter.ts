/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

const defaultFieldFormatParams: Record<string, FieldFormatParams> = {
  duration: {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
  },
  number: {
    pattern: '00.00',
  },
};

/**
 * Extracts field formatters from the field formats service
 */
export const useFieldFormatter = (fieldFormats: FieldFormatsStart) => {
  return (fieldType: string, params?: FieldFormatParams) => {
    const fieldFormatter = fieldFormats.deserialize({
      id: fieldType,
      params: params ?? defaultFieldFormatParams[fieldType],
    });
    return fieldFormatter.convert.bind(fieldFormatter);
  };
};
