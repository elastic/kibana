/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import type { FormBasedLayer, GenericIndexPatternColumn, IndexPattern } from '@kbn/lens-common';

import { getESQLForLayer } from './to_esql';

const defaultUiSettingsGet = (key: string) => {
  switch (key) {
    case 'dateFormat':
      return 'MMM D, YYYY @ HH:mm:ss.SSS';
    case 'dateFormat:scaled':
      return [[]];
    case 'dateFormat:tz':
      return 'UTC';
    case 'histogram:barTarget':
      return 50;
    case 'histogram:maxBars':
      return 100;
  }
};

const mockAggEntries: Array<readonly [string, GenericIndexPatternColumn]> = [
  [
    '1',
    {
      label: 'Top 5 values of host.keyword',
      dataType: 'string',
      operationType: 'terms',
      sourceField: 'host.keyword',
      isBucketed: true,
    },
  ],
  [
    '2',
    {
      label: 'Average of bytes',
      dataType: 'number',
      operationType: 'average',
      sourceField: 'bytes',
      isBucketed: false,
    },
  ],
];

const mockIndexPattern = {
  title: 'kibana_sample_data_logs',
  timeFieldName: 'timestamp',
  getFieldByName: (field: string) => {
    if (field === 'records') return undefined;
    return { name: field };
  },
  getFormatterForField: () => ({ convert: (v: unknown) => v }),
} as unknown as IndexPattern;

const mockLayer: FormBasedLayer = {
  columns: {
    '1': {
      label: 'Top 5 values of host.keyword',
      dataType: 'string',
      operationType: 'terms',
      sourceField: 'host.keyword',
      isBucketed: true,
    },
    '2': {
      label: 'Average of bytes',
      dataType: 'number',
      operationType: 'average',
      sourceField: 'bytes',
      isBucketed: false,
    },
  },
  columnOrder: ['1', '2'],
  incompleteColumns: {},
  sampling: 1,
  indexPatternId: mockIndexPattern.id,
};

const mockDateRange = {
  fromDate: '2021-01-01T00:00:00.000Z',
  toDate: '2021-01-01T23:59:59.999Z',
};

const mockNowInstant = new Date();

describe('to_esql top N', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  // Note: operationDefinitionMap for "terms" does not support toESQL
  // should generate a valid ESQL query for top N terms and average aggregation
  it('should return undefined for top N terms and average aggregation', () => {
    const result = getESQLForLayer(
      mockAggEntries,
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      mockNowInstant
    );

    expect(result?.esql).toEqual(undefined);
  });
});
