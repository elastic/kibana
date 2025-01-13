/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '../../types';
import { getESQLForLayer } from './to_esql';
import { createCoreSetupMock } from '@kbn/core-lifecycle-browser-mocks/src/core_setup.mock';
import { DateHistogramIndexPatternColumn } from '../..';

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
    const esql = getESQLForLayer(
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

    expect(esql?.esql).toEqual(
      'FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(`order_date`, 30 minutes) | SORT order_date ASC'
    );
  });

  it('should return undefined if missing row option is set', () => {
    const esql = getESQLForLayer(
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

    expect(esql?.esql).toEqual(undefined);
  });

  it('should return undefined if lens formula is used', () => {
    const esql = getESQLForLayer(
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

    expect(esql).toEqual(undefined);
  });

  test('it should add a where condition to esql if timeField is set', () => {
    const esql = getESQLForLayer(
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

    expect(esql?.esql).toEqual(
      'FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(`order_date`, 30 minutes) | SORT order_date ASC'
    );
  });

  it('should not add a where condition to esql if timeField is not set', () => {
    const esql = getESQLForLayer(
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

    expect(esql?.esql).toEqual(
      'FROM myIndexPattern | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(`order_date`, 30 minutes) | SORT order_date ASC'
    );
  });

  it('should return undefined if timezone is not UTC', () => {
    uiSettings.get.mockImplementation((key: string) => {
      if (key === 'dateFormat:tz') return 'America/Chicago';
      return defaultUiSettingsGet(key);
    });

    const esql = getESQLForLayer(
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

    expect(esql).toEqual(undefined);
  });

  it('should work with iana timezones that fall udner utc+0', () => {
    uiSettings.get.mockImplementation((key: string) => {
      if (key === 'dateFormat:tz') return 'Europe/London';
      return defaultUiSettingsGet(key);
    });

    const esql = getESQLForLayer(
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

    expect(esql?.esql).toEqual(
      `FROM myIndexPattern | WHERE order_date >= ?_tstart AND order_date <= ?_tend | STATS bucket_0_0 = COUNT(*) BY order_date = BUCKET(\`order_date\`, 30 minutes) | SORT order_date ASC`
    );
  });
});
