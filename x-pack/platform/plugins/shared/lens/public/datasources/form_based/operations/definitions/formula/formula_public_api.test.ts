/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { insertOrReplaceFormulaColumn } from './parse';
import { createFormulaPublicApi, FormulaPublicApi } from './formula_public_api';

import type { DataView } from '@kbn/data-views-plugin/public';
import type { DateHistogramIndexPatternColumn, PersistedIndexPatternLayer } from '../../../types';
import { convertDataViewIntoLensIndexPattern } from '../../../../../data_views_service/loader';
import moment from 'moment';
import type { FormulaIndexPatternColumn } from './formula';

jest.mock('./parse', () => {
  const original = jest.requireActual('./parse');
  return {
    ...original,
    insertOrReplaceFormulaColumn: jest.fn((...args) =>
      original.insertOrReplaceFormulaColumn(...args)
    ),
  };
});

jest.mock('../../../../../data_views_service/loader', () => ({
  convertDataViewIntoLensIndexPattern: jest.fn((v) => v),
}));

const getBaseLayer = (): PersistedIndexPatternLayer => ({
  columnOrder: ['col1'],
  columns: {
    col1: {
      dataType: 'date',
      isBucketed: true,
      label: '@timestamp',
      operationType: 'date_histogram',
      params: { interval: 'auto' },
      scale: 'interval',
    } as DateHistogramIndexPatternColumn,
  },
});

describe('createFormulaPublicApi', () => {
  let publicApiHelper: FormulaPublicApi;
  let dataView: DataView;

  beforeEach(() => {
    publicApiHelper = createFormulaPublicApi();
    dataView = {} as DataView;

    jest.clearAllMocks();
  });

  test('should use cache for caching lens index patterns', () => {
    const baseLayer = getBaseLayer();

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    expect(convertDataViewIntoLensIndexPattern).toHaveBeenCalledTimes(1);
  });

  test('should execute insertOrReplaceFormulaColumn with valid arguments', () => {
    const baseLayer = getBaseLayer();

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      { formula: 'count()' },
      baseLayer,
      dataView
    );

    expect(insertOrReplaceFormulaColumn).toHaveBeenCalledWith(
      'col',
      {
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        label: 'count()',
        operationType: 'formula',
        params: { formula: 'count()' },
        references: [],
      },
      {
        columnOrder: ['col1'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: { interval: 'auto' },
            scale: 'interval',
          },
        },
        indexPatternId: undefined,
      },
      { indexPattern: {} }
    );
  });

  test('should pass over advanced parameters as global params for formula', () => {
    const baseLayer = getBaseLayer();

    publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      {
        formula: 'count()',
        timeScale: 'd',
        filter: { query: 'myField: *', language: 'kuery' },
        reducedTimeRange: '30s',
      },
      baseLayer,
      dataView
    );

    expect(insertOrReplaceFormulaColumn).toHaveBeenCalledWith(
      'col',
      {
        customLabel: false,
        dataType: 'number',
        isBucketed: false,
        label: 'count()',
        operationType: 'formula',
        params: { formula: 'count()', format: undefined },
        filter: {
          language: 'kuery',
          query: 'myField: *',
        },
        timeScale: 'd',
        reducedTimeRange: '30s',
        references: [],
      },
      {
        columnOrder: ['col1'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '@timestamp',
            operationType: 'date_histogram',
            params: { interval: 'auto' },
            scale: 'interval',
          },
        },
        indexPatternId: undefined,
      },
      { indexPattern: {} }
    );
  });

  test('should accept an absolute time shift for shiftable operations', () => {
    const baseLayer = getBaseLayer();

    const dateString = '2022-11-02T00:00:00.000Z';
    // shift by 2 days + 2500 s (to get a shift which is not a multiple of the given interval)
    const shiftedDate = moment(dateString).subtract(175300, 's').toISOString();

    const result = publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      {
        formula: `count(shift='startAt(${shiftedDate})') - count(shift='endAt(${shiftedDate})')`,
      },
      baseLayer,
      dataView
    );
    expect((result?.columns.col as FormulaIndexPatternColumn).params.isFormulaBroken).toBe(false);
  });

  test('should perform more validations for absolute time shifts if dateRange is passed', () => {
    const baseLayer = getBaseLayer();

    const dateString = '2022-11-02T00:00:00.000Z';
    // date in the future
    const shiftedDate = '3022-11-02T00:00:00.000Z';

    const dateRange = {
      fromDate: moment(dateString).subtract('1', 'd').toISOString(),
      toDate: moment(dateString).add('1', 'd').toISOString(),
    };

    const result = publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      {
        formula: `count(shift='startAt(${shiftedDate})') - count(shift='endAt(${shiftedDate})')`,
      },
      baseLayer,
      dataView,
      dateRange
    );

    expect((result?.columns.col as FormulaIndexPatternColumn).params.isFormulaBroken).toBe(true);
  });

  test('should perform format-only validation if no date range is passed', () => {
    const baseLayer = getBaseLayer();

    const result = publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      {
        formula: `count(shift='startAt(invalid)') - count(shift='endAt(3022)')`,
      },
      baseLayer,
      dataView
    );

    expect((result?.columns.col as FormulaIndexPatternColumn).params.isFormulaBroken).toBe(true);
  });

  test('should not detect date in the future error if no date range is passed', () => {
    const baseLayer = getBaseLayer();

    // date in the future
    const shiftedDate = '3022-11-02T00:00:00.000Z';

    const result = publicApiHelper.insertOrReplaceFormulaColumn(
      'col',
      {
        formula: `count(shift='startAt(${shiftedDate})') - count(shift='endAt(${shiftedDate})')`,
      },
      baseLayer,
      dataView
    );

    expect((result?.columns.col as FormulaIndexPatternColumn).params.isFormulaBroken).toBe(false);
  });
});
