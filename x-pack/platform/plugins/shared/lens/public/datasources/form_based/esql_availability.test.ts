/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { generateEsqlQuery } from '@kbn/lens-common';
import type { FormBasedLayer } from '@kbn/lens-common';
import { createMockedIndexPattern } from './mocks';
import { getFormBasedEsqlAvailability, getLayerEsqlQuery } from './esql_availability';

jest.mock('@kbn/lens-common', () => ({
  ...jest.requireActual('@kbn/lens-common'),
  generateEsqlQuery: jest.fn(),
}));

const generateEsqlQueryMock = jest.mocked(generateEsqlQuery);

const indexPattern = createMockedIndexPattern();
const uiSettings = coreMock.createStart().uiSettings;
const dateRange = { fromDate: '2022-03-17T08:25:00.000Z', toDate: '2022-04-17T08:25:34.000Z' };
const nowInstant = new Date('2022-04-17T08:25:34.000Z');

const createCountLayer = (): FormBasedLayer => ({
  indexPatternId: indexPattern.id,
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
});

const successResult = {
  success: true as const,
  esql: 'FROM logs | STATS count = COUNT(*)',
  partialRows: true,
  esAggsIdMap: {},
};

const availabilityArgs = {
  indexPatterns: { [indexPattern.id]: indexPattern },
  uiSettings,
  dateRange,
  nowInstant,
};

describe('getLayerEsqlQuery', () => {
  beforeEach(() => {
    generateEsqlQueryMock.mockReset();
  });

  it('returns the generated result', () => {
    generateEsqlQueryMock.mockReturnValue(successResult);
    expect(
      getLayerEsqlQuery({
        layer: createCountLayer(),
        indexPattern,
        uiSettings,
        dateRange,
        nowInstant,
      })
    ).toBe(successResult);
  });

  it('reports an unknown failure when the generator throws', () => {
    generateEsqlQueryMock.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(
      getLayerEsqlQuery({
        layer: createCountLayer(),
        indexPattern,
        uiSettings,
        dateRange,
        nowInstant,
      })
    ).toEqual({ success: false, reason: 'unknown' });
  });
});

describe('getFormBasedEsqlAvailability', () => {
  beforeEach(() => {
    generateEsqlQueryMock.mockReset();
  });

  it('is available when every layer converts', () => {
    generateEsqlQueryMock.mockReturnValue(successResult);
    expect(
      getFormBasedEsqlAvailability({
        ...availabilityArgs,
        layers: { first: createCountLayer(), second: createCountLayer() },
        layerIds: ['first', 'second'],
      })
    ).toEqual({ isAvailable: true });
    expect(generateEsqlQueryMock).toHaveBeenCalledTimes(2);
  });

  it('returns the reason of the first layer that cannot convert', () => {
    generateEsqlQueryMock
      .mockReturnValueOnce(successResult)
      .mockReturnValueOnce({ success: false, reason: 'time_shift_not_supported' })
      .mockReturnValueOnce({ success: false, reason: 'formula_not_supported' });
    expect(
      getFormBasedEsqlAvailability({
        ...availabilityArgs,
        layers: { a: createCountLayer(), b: createCountLayer(), c: createCountLayer() },
        layerIds: ['a', 'b', 'c'],
      })
    ).toEqual({ isAvailable: false, reason: 'time_shift_not_supported' });
  });

  it('skips empty layers and layers without a loaded data view', () => {
    expect(
      getFormBasedEsqlAvailability({
        ...availabilityArgs,
        layers: {
          empty: { ...createCountLayer(), columnOrder: [], columns: {} },
          unloaded: { ...createCountLayer(), indexPatternId: 'missing' },
        },
        layerIds: ['empty', 'unloaded'],
      })
    ).toEqual({ isAvailable: true });
    expect(generateEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('reports an unknown failure for a layer id without a layer', () => {
    expect(
      getFormBasedEsqlAvailability({
        ...availabilityArgs,
        layers: {},
        layerIds: ['missing'],
      })
    ).toEqual({ isAvailable: false, reason: 'unknown' });
  });
});
