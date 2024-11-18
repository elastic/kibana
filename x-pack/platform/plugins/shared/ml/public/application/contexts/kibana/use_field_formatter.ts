/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldFormatParams } from '@kbn/field-formats-plugin/common';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { useMlKibana } from './kibana_context';

/**
 * Set of reasonable defaults for formatters for the ML app.
 */
const defaultParam: Record<string, FieldFormatParams> = {
  [FIELD_FORMAT_IDS.DURATION]: {
    inputFormat: 'milliseconds',
    outputFormat: 'humanizePrecise',
  },
  [FIELD_FORMAT_IDS.NUMBER]: {
    pattern: '00.00',
  },
};

export const getFieldFormatterProvider =
  (fieldFormats: FieldFormatsStart) =>
  (fieldType: FIELD_FORMAT_IDS, params?: FieldFormatParams) => {
    const fieldFormatter = fieldFormats.deserialize({
      id: fieldType,
      params: params ?? defaultParam[fieldType],
    });
    return fieldFormatter.convert.bind(fieldFormatter);
  };

export function useFieldFormatter(fieldType: FIELD_FORMAT_IDS) {
  const {
    services: { fieldFormats },
  } = useMlKibana();
  return getFieldFormatterProvider(fieldFormats)(fieldType);
}
