/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import type { FormBasedLayer, GenericIndexPatternColumn, IndexPattern } from '@kbn/lens-common';

import { generateEsqlQuery } from './generate_esql_query';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import { mockDateRange } from './__mocks__/esql_query_mocks';

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

describe('generateEsqlQuery top N', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  // Note: operationDefinitionMap for "terms" does not support toESQL
  // should generate a valid ESQL query for top N terms and average aggregation
  it('should return failure with terms_not_supported reason for top N terms and average aggregation', () => {
    const result = generateEsqlQuery(
      mockAggEntries,
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'terms_not_supported',
    });
  });
});
