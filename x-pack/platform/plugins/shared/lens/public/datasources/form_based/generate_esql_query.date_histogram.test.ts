/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DateHistogramIndexPatternColumn,
  FormBasedLayer,
  GenericIndexPatternColumn,
} from '@kbn/lens-common';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import { mockLayer, mockIndexPattern, mockDateRange } from './__mocks__/esql_query_mocks';

const baseDateHistogramColumn: Omit<DateHistogramIndexPatternColumn, 'params'> = {
  operationType: 'date_histogram',
  sourceField: 'order_date',
  label: 'Date histogram',
  dataType: 'date',
  isBucketed: true,
};

const countColumn: GenericIndexPatternColumn = {
  operationType: 'count',
  sourceField: 'records',
  label: 'Count',
  dataType: 'number',
  isBucketed: false,
};

function buildLayer(dateHistogramCol: DateHistogramIndexPatternColumn): FormBasedLayer {
  return {
    ...mockLayer,
    columns: {
      '1': dateHistogramCol,
      '2': countColumn,
    },
    columnOrder: ['1', '2'],
  };
}

function buildAggEntries(dateHistogramCol: DateHistogramIndexPatternColumn) {
  return [['1', dateHistogramCol] as const, ['2', countColumn] as const];
}

describe('generateEsqlQuery date histogram', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  describe('auto interval', () => {
    it('should use BUCKET(..., 75, ?_tstart, ?_tend) when date range is provided', () => {
      const dateHistogramCol: DateHistogramIndexPatternColumn = {
        ...baseDateHistogramColumn,
        params: { interval: 'auto' },
      };
      const result = generateEsqlQuery(
        buildAggEntries(dateHistogramCol),
        buildLayer(dateHistogramCol),
        mockIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 75, ?_tstart, ?_tend)');
      }
    });

    it(`should fall back to 'auto' when params.interval is missing (uses BUCKET(order_date, 75, ?_tstart, ?_tend))`, () => {
      const dateHistogramCol = {
        ...baseDateHistogramColumn,
        params: {},
      };
      const result = generateEsqlQuery(
        // Cast needed: params.interval is required by the type, but we intentionally
        // omit it to test the missing-interval (auto) behavior.
        buildAggEntries(dateHistogramCol as DateHistogramIndexPatternColumn),
        buildLayer(dateHistogramCol as DateHistogramIndexPatternColumn),
        mockIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 75, ?_tstart, ?_tend)');
      }
    });

    it('should fall back to 1 hour when date range is missing', () => {
      const dateHistogramCol: DateHistogramIndexPatternColumn = {
        ...baseDateHistogramColumn,
        params: { interval: 'auto' },
      };
      // Missing date range: hasDateRange is false, so date_histogram toESQL uses 1h fallback
      const noDateRange = {
        fromDate: undefined as unknown as string,
        toDate: undefined as unknown as string,
      };
      const result = generateEsqlQuery(
        buildAggEntries(dateHistogramCol),
        buildLayer(dateHistogramCol),
        mockIndexPattern,
        uiSettings,
        noDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 1 hour)');
      }
    });
  });

  describe('fixed (non-auto) interval', () => {
    it('should use BUCKET(..., 1 hour) for interval 1h', () => {
      const dateHistogramCol: DateHistogramIndexPatternColumn = {
        ...baseDateHistogramColumn,
        params: { interval: '1h' },
      };
      const result = generateEsqlQuery(
        buildAggEntries(dateHistogramCol),
        buildLayer(dateHistogramCol),
        mockIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 1 hour)');
      }
    });

    it('should use BUCKET(..., 30 minutes) for interval 30m', () => {
      const dateHistogramCol: DateHistogramIndexPatternColumn = {
        ...baseDateHistogramColumn,
        params: { interval: '30m' },
      };
      const result = generateEsqlQuery(
        buildAggEntries(dateHistogramCol),
        buildLayer(dateHistogramCol),
        mockIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 30 minutes)');
      }
    });

    it('should use BUCKET(..., 1 day) for interval 1d', () => {
      const dateHistogramCol: DateHistogramIndexPatternColumn = {
        ...baseDateHistogramColumn,
        params: { interval: '1d' },
      };
      const result = generateEsqlQuery(
        buildAggEntries(dateHistogramCol),
        buildLayer(dateHistogramCol),
        mockIndexPattern,
        uiSettings,
        mockDateRange,
        new Date()
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.esql).toContain('BUCKET(order_date, 1 day)');
      }
    });
  });
});
