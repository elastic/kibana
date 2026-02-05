/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import {
  mockLayer,
  mockIndexPattern,
  mockIndexPatternWithoutTimeField,
  mockDateRange,
} from './__mocks__/esql_query_mocks';

describe('generateEsqlQuery', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  it('should produce valid esql for date histogram and count', () => {
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
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*)
        BY order_date = BUCKET(order_date, 30 minutes)`,
      })
    );
  });

  it('should return failure with include_empty_rows_not_supported reason if missing row option is set', () => {
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
            params: { includeEmptyRows: true },
          } as DateHistogramIndexPatternColumn,
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
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'include_empty_rows_not_supported',
    });
  });

  it('should return failure with formula_not_supported reason if lens formula is used', () => {
    const result = generateEsqlQuery(
      [
        [
          '1',
          {
            operationType: 'formula',
            label: 'Formula',
            isBucketed: false,
            params: {},
            dataType: 'number',
          },
        ],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'formula_not_supported',
    });
  });

  test('it should add a where condition to esql if timeField is set', () => {
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
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*)
        BY order_date = BUCKET(order_date, 30 minutes)`,
      })
    );
  });

  it('should not add a where condition to esql if timeField is not set', () => {
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
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: `FROM myIndexPattern
  | STATS bucket_0_0 = COUNT(*)
        BY order_date = BUCKET(order_date, 30 minutes)`,
      })
    );
  });

  it('should return failure with non_utc_timezone reason if timezone is not UTC', () => {
    uiSettings.get.mockImplementation((key: string) => {
      if (key === 'dateFormat:tz') return 'America/Chicago';
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
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual({
      success: false,
      reason: 'non_utc_timezone',
    });
  });

  it('should work with iana timezones that fall under UTC+0', () => {
    uiSettings.get.mockImplementation((key: string) => {
      // There are only few countries that falls under UTC all year round, others just fall into that configuration half hear when not in DST
      if (key === 'dateFormat:tz') return 'Atlantic/Reykjavik';
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
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*)
        BY order_date = BUCKET(order_date, 30 minutes)`,
      })
    );
  });

  it('should preserve user-configured format (e.g., currency) in esAggsIdMap', () => {
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
            operationType: 'sum',
            sourceField: 'price',
            label: 'Sum of price',
            dataType: 'number',
            isBucketed: false,
            params: {
              format: {
                id: 'currency',
                params: {
                  decimals: 2,
                  pattern: '$0,0.00',
                },
              },
            },
          },
        ],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Find the metric column in esAggsIdMap
      const metricKey = Object.keys(result.esAggsIdMap).find((key) => key.startsWith('bucket_'));
      expect(metricKey).toBeDefined();
      const metricColumn = result.esAggsIdMap[metricKey!][0];
      expect(metricColumn.format).toEqual({
        id: 'currency',
        params: {
          decimals: 2,
          pattern: '$0,0.00',
        },
      });
    }
  });

  it('should preserve user-configured bytes format in esAggsIdMap', () => {
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
            operationType: 'average',
            sourceField: 'bytes',
            label: 'Average bytes',
            dataType: 'number',
            isBucketed: false,
            params: {
              format: {
                id: 'bytes',
                params: {
                  decimals: 2,
                },
              },
            },
          },
        ],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Find the metric column in esAggsIdMap
      const metricKey = Object.keys(result.esAggsIdMap).find((key) => key.startsWith('bucket_'));
      expect(metricKey).toBeDefined();
      const metricColumn = result.esAggsIdMap[metricKey!][0];
      expect(metricColumn.format).toEqual({
        id: 'bytes',
        params: {
          decimals: 2,
        },
      });
    }
  });

  it('should work with custom filters on the layer', () => {
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
            filter: {
              query: 'geo.src:"US"',
              language: 'kuery',
            },
          },
        ],
      ],
      mockLayer,
      mockIndexPattern,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*) WHERE KQL("geo.src:\\"US\\"")
        BY order_date = BUCKET(order_date, 30 minutes)`,
      })
    );
  });
});
