/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormBasedLayer, IndexPattern, IndexPatternField } from '@kbn/lens-common';

export const mockLayer: FormBasedLayer = {
  indexPatternId: 'myIndexPattern',
  columns: {
    '2': {
      operationType: 'count',
      sourceField: 'records',
      label: 'Count',
      dataType: 'number',
      isBucketed: false,
    },
  },
  columnOrder: [],
};

export const mockIndexPattern = {
  title: 'myIndexPattern',
  timeFieldName: 'order_date',
  getFieldByName: (field: string) => {
    if (field === '__records__') return undefined;
    return {
      name: field,
      displayName: 'Records',
      type: 'document',
    };
  },
  getFormatterForField: () => ({ convert: (v: unknown) => v }),
  fields: [
    {
      displayName: 'Records',
      customLabel: 'Records',
      name: '___records___',
      type: 'document',
      aggregatable: true,
      searchable: true,
    },
  ] satisfies IndexPatternField[],
} as unknown as IndexPattern;

export const mockIndexPatternWithoutTimeField = {
  title: 'myIndexPattern',
  getFieldByName: (field: string) => {
    if (field === 'records') {
      return {
        name: field,
        displayName: 'Records',
        type: 'document',
      };
    }
    return undefined;
  },
  getFormatterForField: () => ({ convert: (v: unknown) => v }),
  fields: [
    {
      displayName: 'Records',
      customLabel: 'Records',
      name: '___records___',
      type: 'document',
      aggregatable: true,
      searchable: true,
    },
  ] satisfies IndexPatternField[],
} as unknown as IndexPattern;

export const mockDateRange = {
  fromDate: '2021-01-01T00:00:00.000Z',
  toDate: '2021-01-01T23:59:59.999Z',
};
