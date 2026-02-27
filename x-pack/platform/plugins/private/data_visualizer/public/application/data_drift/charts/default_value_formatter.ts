/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useCallback } from 'react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { useDataVisualizerKibana } from '../../kibana_context';

export const getFieldFormatType = (type: string) => {
  switch (type) {
    case 'number':
      return FIELD_FORMAT_IDS.NUMBER;
    case 'boolean':
      return FIELD_FORMAT_IDS.BOOLEAN;
    default:
      return FIELD_FORMAT_IDS.STRING;
  }
};
export const useFieldFormatter = (fieldType: FIELD_FORMAT_IDS) => {
  const {
    services: {
      data: { fieldFormats },
    },
  } = useDataVisualizerKibana();

  const fieldFormatter = useMemo(() => {
    return fieldFormats.deserialize({
      id: fieldType,
    });
  }, [fieldFormats, fieldType]);

  return useCallback(
    (v: unknown) => {
      const func = fieldFormatter.convert.bind(fieldFormatter);
      return func(v);
    },
    [fieldFormatter]
  );
};
