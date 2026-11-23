/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ESQL } from '@kbn/esql-utils';
import { coreMock } from '@kbn/core/public/mocks';
import type { FormBasedLayer, FormBasedPrivateState } from '@kbn/lens-common';
import { createMockedIndexPattern } from './mocks';
import { getFormBasedEsqlAvailability } from './esql_availability';
import { toExpression } from './to_expression';

const indexPattern = createMockedIndexPattern();
const indexPatterns = { '1': indexPattern };
const dateRange = { fromDate: '2022-03-17T08:25:00.000Z', toDate: '2022-04-17T08:25:34.000Z' };
const nowInstant = new Date('2022-04-17T08:25:34.000Z');

const stateWithCount: FormBasedPrivateState = {
  currentIndexPatternId: '1',
  layers: {
    first: {
      indexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          label: 'Count of records',
          dataType: 'number',
          isBucketed: false,
          sourceField: '___records___',
          operationType: 'count',
        },
      },
    },
  },
};

const createUiSettings = ({ esqlSettingEnabled }: { esqlSettingEnabled: boolean }) => {
  const uiSettings = coreMock.createStart().uiSettings;
  uiSettings.get.mockImplementation((key: string) => {
    switch (key) {
      case ENABLE_ESQL:
        return esqlSettingEnabled;
      // Date histogram conversion reads these to pick the interval and the label format.
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
  });
  return uiSettings;
};

const getExpressionAst = ({
  state,
  esqlSettingEnabled = true,
  forceDSL,
}: {
  state: FormBasedPrivateState;
  esqlSettingEnabled?: boolean;
  forceDSL?: boolean;
}) => {
  const uiSettings = createUiSettings({ esqlSettingEnabled });
  return toExpression(
    state,
    'first',
    indexPatterns,
    uiSettings,
    dateRange,
    nowInstant,
    'testing-seed',
    forceDSL
  );
};

const getDataFunctionName = (args: Parameters<typeof getExpressionAst>[0]) => {
  const functionNames = getExpressionAst(args)?.chain.map(({ function: name }) => name) ?? [];
  return functionNames.find((name) => name === 'esql' || name === 'esaggs');
};

describe('form based toExpression engine selection', () => {
  it('uses DSL when useEsql is not set', () => {
    expect(getDataFunctionName({ state: stateWithCount })).toBe('esaggs');
  });

  it('uses DSL when useEsql is false', () => {
    expect(getDataFunctionName({ state: { ...stateWithCount, useEsql: false } })).toBe('esaggs');
  });

  it('uses ES|QL when useEsql is true', () => {
    expect(getDataFunctionName({ state: { ...stateWithCount, useEsql: true } })).toBe('esql');
  });

  it('uses DSL when useEsql is true but the ES|QL advanced setting is disabled', () => {
    expect(
      getDataFunctionName({
        state: { ...stateWithCount, useEsql: true },
        esqlSettingEnabled: false,
      })
    ).toBe('esaggs');
  });

  it('uses DSL when useEsql is true but forceDSL is set', () => {
    expect(
      getDataFunctionName({ state: { ...stateWithCount, useEsql: true }, forceDSL: true })
    ).toBe('esaggs');
  });

  it('feeds the ES|QL request from the kibana search context so fast mode applies', () => {
    // `kibana` forwards `isApproximate` from the search context and `esql` reads it from its input.
    const functionNames = getExpressionAst({
      state: { ...stateWithCount, useEsql: true },
    })?.chain.map(({ function: name }) => name);
    const esqlIndex = functionNames?.indexOf('esql') ?? -1;
    expect(esqlIndex).toBeGreaterThan(0);
    expect(functionNames?.[esqlIndex - 1]).toBe('kibana');
  });
});

describe('form based ES|QL availability matches the engine used by toExpression', () => {
  const countColumn = {
    label: 'Count of records',
    dataType: 'number' as const,
    isBucketed: false,
    sourceField: '___records___',
    operationType: 'count' as const,
  };
  const dateHistogramColumn = (includeEmptyRows: boolean) => ({
    label: 'Date',
    dataType: 'date' as const,
    isBucketed: true,
    sourceField: 'timestamp',
    operationType: 'date_histogram' as const,
    params: { interval: '1d', includeEmptyRows },
  });

  const cases: Array<{
    name: string;
    columns: FormBasedLayer['columns'];
    expectedEngine: 'esql' | 'esaggs';
  }> = [
    { name: 'a count metric', columns: { col1: countColumn }, expectedEngine: 'esql' },
    {
      name: 'a count metric with a static value (gauge max)',
      columns: {
        col1: countColumn,
        col2: {
          label: 'Static value: 100',
          dataType: 'number',
          isBucketed: false,
          operationType: 'static_value',
          references: [],
          params: { value: '100' },
        } as FormBasedLayer['columns'][string],
      },
      expectedEngine: 'esql',
    },
    {
      name: 'a date histogram without empty rows',
      columns: { col1: countColumn, col2: dateHistogramColumn(false) },
      expectedEngine: 'esql',
    },
    {
      name: 'a date histogram with empty rows',
      columns: { col1: countColumn, col2: dateHistogramColumn(true) },
      expectedEngine: 'esaggs',
    },
    {
      name: 'a metric with a time shift',
      columns: { col1: { ...countColumn, timeShift: '1d' } },
      expectedEngine: 'esaggs',
    },
  ];

  it.each(cases)('$name', ({ columns, expectedEngine }) => {
    const layer: FormBasedLayer = {
      indexPatternId: '1',
      columnOrder: Object.keys(columns),
      columns,
    };
    const state: FormBasedPrivateState = {
      currentIndexPatternId: '1',
      layers: { first: layer },
      useEsql: true,
    };

    const availability = getFormBasedEsqlAvailability({
      layers: state.layers,
      layerIds: ['first'],
      indexPatterns,
      uiSettings: createUiSettings({ esqlSettingEnabled: true }),
      dateRange,
      nowInstant,
    });

    expect(getDataFunctionName({ state })).toBe(expectedEngine);
    expect(availability.isAvailable).toBe(expectedEngine === 'esql');
  });
});
