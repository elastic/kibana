/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern } from '@kbn/lens-common';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';

describe('generateEsqlQuery metric max (static_value)', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  const layer = {
    indexPatternId: 'myIndexPattern',
    columns: {},
    columnOrder: [],
  };

  const indexPattern = {
    title: 'myIndexPattern',
    timeFieldName: 'order_date',
    getFieldByName: (field: string) => {
      if (field === 'records') return undefined;
      return { name: field };
    },
    getFormatterForField: () => ({ convert: (v: unknown) => v }),
  } as unknown as IndexPattern;

  it('should convert static_value columns to EVAL statements', () => {
    uiSettings.get.mockImplementation((key: string) => {
      return defaultUiSettingsGet(key);
    });

    const result = generateEsqlQuery(
      [
        [
          '1',
          {
            operationType: 'date_histogram',
            sourceField: 'order_date',
            label: 'Date histogram',
            dataType: 'date',
            isBucketed: true,
            interval: 'auto',
          },
        ],
        [
          '2',
          {
            operationType: 'count',
            sourceField: 'records',
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
          },
        ],
        [
          '3',
          {
            operationType: 'static_value',
            label: 'Static value: 100',
            dataType: 'number',
            isBucketed: false,
            references: [],
            params: {
              value: '100',
            },
          },
        ],
      ],
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toContain('EVAL static_0 = 100');
      // Check that the static value column is in esAggsIdMap
      expect(result.esAggsIdMap).toHaveProperty('static_0');
      expect(result.esAggsIdMap.static_0[0].id).toBe('3');
    }
  });

  it('should handle static_value without other metrics', () => {
    uiSettings.get.mockImplementation((key: string) => {
      return defaultUiSettingsGet(key);
    });

    const result = generateEsqlQuery(
      [
        [
          '1',
          {
            operationType: 'static_value',
            label: 'Static value: 50',
            dataType: 'number',
            isBucketed: false,
            references: [],
            params: {
              value: '50',
            },
          },
        ],
      ],
      layer,
      {
        title: 'myIndexPattern',
        getFieldByName: (field: string) => {
          if (field === 'records') return undefined;
          return { name: field };
        },
        getFormatterForField: () => ({ convert: (v: unknown) => v }),
      } as unknown as IndexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.esql).toContain('EVAL static_0 = 50');
      expect(result.esAggsIdMap).toHaveProperty('static_0');
    }
  });
});
