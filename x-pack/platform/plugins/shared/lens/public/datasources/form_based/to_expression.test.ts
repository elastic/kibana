/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ESQL } from '@kbn/esql-utils';
import { coreMock } from '@kbn/core/public/mocks';
import type { FormBasedPrivateState } from '@kbn/lens-common';
import { createMockedIndexPattern } from './mocks';
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

const getDataFunctionName = ({
  state,
  esqlSettingEnabled = true,
  forceDSL,
}: {
  state: FormBasedPrivateState;
  esqlSettingEnabled?: boolean;
  forceDSL?: boolean;
}) => {
  const uiSettings = coreMock.createStart().uiSettings;
  uiSettings.get.mockImplementation((key: string) => {
    if (key === ENABLE_ESQL) return esqlSettingEnabled;
    return undefined;
  });
  const ast = toExpression(
    state,
    'first',
    indexPatterns,
    uiSettings,
    dateRange,
    nowInstant,
    'testing-seed',
    forceDSL
  );
  const functionNames = ast?.chain.map(({ function: name }) => name) ?? [];
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
});
