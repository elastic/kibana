/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPattern, DateHistogramIndexPatternColumn } from '@kbn/lens-common';
import { generateEsqlQuery } from './generate_esql_query';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';

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

describe('to_esql', () => {
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
    expect(result.success && result.esql).toEqual(
      `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(order_date, 30 minutes)
  | SORT order_date ASC`
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
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(result.success).toBe(false);
    expect(!result.success && result.reason).toEqual('include_empty_rows_not_supported');
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
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(result.success).toBe(false);
    expect(!result.success && result.reason).toEqual('formula_not_supported');
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
    expect(result.success && result.esql).toEqual(
      `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(order_date, 30 minutes)
  | SORT order_date ASC`
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
    expect(result.success && result.esql).toEqual(
      `FROM myIndexPattern
  | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(order_date, 30 minutes)
  | SORT order_date ASC`
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
      layer,
      indexPattern,
      uiSettings,
      {
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: '2021-01-01T23:59:59.999Z',
      },
      new Date()
    );

    expect(result.success).toBe(false);
    expect(!result.success && result.reason).toEqual('non_utc_timezone');
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
    expect(result.success && result.esql).toEqual(
      `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(order_date, 30 minutes)
  | SORT order_date ASC`
    );
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
    expect(result.success && result.esql).toEqual(
      `FROM myIndexPattern
  | WHERE order_date >= ?_tstart AND order_date <= ?_tend
  | STATS bucket_0_0 = COUNT(*) WHERE KQL("geo.src:\\"US\\"") BY order_date = BUCKET(order_date, 30 minutes)
  | SORT order_date ASC`
    );
  });
});
