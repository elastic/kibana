/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericIndexPatternColumn, StaticValueIndexPatternColumn } from '@kbn/lens-common';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { defaultUiSettingsGet } from './__mocks__/ui_settings';
import {
  mockLayer,
  mockIndexPattern,
  mockIndexPatternWithoutTimeField,
  mockDateRange,
} from './__mocks__/esql_query_mocks';

// Helper to create static_value column with proper typing
const createStaticValueColumn = (
  value: string,
  label: string
): StaticValueIndexPatternColumn & GenericIndexPatternColumn => ({
  operationType: 'static_value',
  label,
  dataType: 'number',
  isBucketed: false,
  references: [],
  params: {
    value,
  },
});

describe('generateEsqlQuery metric max (static_value)', () => {
  const { uiSettings } = createCoreSetupMock();
  uiSettings.get.mockImplementation((key: string) => {
    return defaultUiSettingsGet(key);
  });

  it('should convert static_value columns to EVAL statements', () => {
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
        ['3', createStaticValueColumn('100', 'Static value: 100')],
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
        BY order_date = BUCKET(order_date, 30 minutes)
  | EVAL static_value = 100`,
      })
    );
    if (result.success) {
      expect(result.esAggsIdMap).toHaveProperty('static_value');
      expect(result.esAggsIdMap.static_value[0].id).toBe('3');
    }
  });

  it('should handle static_value without other metrics', () => {
    const result = generateEsqlQuery(
      [['1', createStaticValueColumn('50', 'Static value: 50')]],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date()
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: 'FROM myIndexPattern | EVAL static_value = 50',
      })
    );
    if (result.success) {
      expect(result.esAggsIdMap).toHaveProperty('static_value');
    }
  });

  it('should use semantic role name when columnRoles provided', () => {
    const result = generateEsqlQuery(
      [
        [
          '1',
          {
            operationType: 'count',
            sourceField: 'records',
            label: 'Count',
            dataType: 'number',
            isBucketed: false,
          },
        ],
        ['max-col-id', createStaticValueColumn('100', 'Static value: 100')],
      ],
      mockLayer,
      mockIndexPatternWithoutTimeField,
      uiSettings,
      mockDateRange,
      new Date(),
      { 'max-col-id': 'max_value' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        esql: 'FROM myIndexPattern | STATS bucket_0_0 = COUNT(*) | EVAL static_max_value = 100',
      })
    );
    if (result.success) {
      expect(result.esAggsIdMap).toHaveProperty('static_max_value');
    }
  });

  it('should use indexed names for multiple static values', () => {
    const result = generateEsqlQuery(
      [
        ['1', createStaticValueColumn('100', 'Static value: 100')],
        ['2', createStaticValueColumn('200', 'Static value: 200')],
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
        esql: 'FROM myIndexPattern | EVAL static_value_0 = 100, static_value_1 = 200',
      })
    );
    if (result.success) {
      expect(result.esAggsIdMap).toHaveProperty('static_value_0');
      expect(result.esAggsIdMap).toHaveProperty('static_value_1');
    }
  });
});
