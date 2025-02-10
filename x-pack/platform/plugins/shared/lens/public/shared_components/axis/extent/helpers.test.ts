/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { createMockDatasource } from '../../../mocks';
import { OperationDescriptor, DatasourcePublicAPI } from '../../../types';
import {
  hasNumericHistogramDimension,
  validateAxisDomain,
  getDataBounds,
  validateZeroInclusivityExtent,
} from './helpers';

describe('validateAxisDomain', () => {
  it('should return true for valid range', () => {
    expect(validateAxisDomain({ lowerBound: 100, upperBound: 200 })).toBeTruthy();
    expect(validateAxisDomain({ lowerBound: -100, upperBound: 0 })).toBeTruthy();
    expect(validateAxisDomain({ lowerBound: -100, upperBound: -50 })).toBeTruthy();
  });

  it('should return false for invalid ranges', () => {
    expect(validateAxisDomain(undefined)).toBeFalsy();
    expect(validateAxisDomain({})).toBeFalsy();
    expect(validateAxisDomain({ lowerBound: 100, upperBound: 50 })).toBeFalsy();
  });

  it('should return false for single value range', () => {
    expect(validateAxisDomain({ lowerBound: 200, upperBound: 200 })).toBeFalsy();
  });

  it('should return false for partial range', () => {
    expect(validateAxisDomain({ lowerBound: undefined, upperBound: 50 })).toBeFalsy();
    expect(validateAxisDomain({ lowerBound: 0, upperBound: undefined })).toBeFalsy();
  });
});

describe('validateZeroInclusivityExtent', () => {
  it('should return true for a 0-100 range', () => {
    expect(validateZeroInclusivityExtent({ lowerBound: 0, upperBound: 100 })).toBeTruthy();
  });

  it('should support negative lower values', () => {
    expect(validateZeroInclusivityExtent({ lowerBound: -100, upperBound: 100 })).toBeTruthy();
  });

  it('should return false for ranges that do not include zero', () => {
    expect(validateZeroInclusivityExtent({ lowerBound: 50, upperBound: 100 })).toBeFalsy();
    expect(validateZeroInclusivityExtent({ lowerBound: -150, upperBound: -100 })).toBeFalsy();
  });

  it('should return false for no extent', () => {
    expect(validateZeroInclusivityExtent(undefined)).toBeFalsy();
  });
});

describe('hasNumericHistogramDimension', () => {
  const datasourceLayers: Record<string, DatasourcePublicAPI> = {
    first: createMockDatasource('test').publicAPIMock,
  };
  it('should return true if a numeric histogram is present', () => {
    datasourceLayers.first.getOperationForColumnId = jest.fn(
      () => ({ isBucketed: true, scale: 'interval', dataType: 'number' } as OperationDescriptor)
    );
    expect(hasNumericHistogramDimension(datasourceLayers.first, 'columnId')).toBeTruthy();
  });

  it('should return false if a date histogram is present', () => {
    datasourceLayers.first.getOperationForColumnId = jest.fn(
      () => ({ isBucketed: true, scale: 'interval', dataType: 'date' } as OperationDescriptor)
    );
    expect(hasNumericHistogramDimension(datasourceLayers.first, 'columnId')).toBeFalsy();
  });

  it('should return false for ordinal types', () => {
    datasourceLayers.first.getOperationForColumnId = jest.fn(
      () => ({ isBucketed: true, scale: 'ordinal', dataType: 'number' } as OperationDescriptor)
    );
    expect(hasNumericHistogramDimension(datasourceLayers.first, 'columnId')).toBeFalsy();
  });

  it('should return false for no dimension', () => {
    datasourceLayers.first.getOperationForColumnId = jest.fn(
      () => ({ isBucketed: true, scale: 'ordinal', dataType: 'number' } as OperationDescriptor)
    );
    expect(hasNumericHistogramDimension(datasourceLayers.first)).toBeFalsy();
  });

  it('should return false for no operation found for the columnId', () => {
    expect(hasNumericHistogramDimension(datasourceLayers.first, 'columnId')).toBeFalsy();
  });
});

describe('getDataBounds', () => {
  function createTable(
    layerId: string,
    columnId: string,
    { bounds: [min, max], addEmptyRows }: { bounds: [number, number]; addEmptyRows?: boolean }
  ) {
    return {
      [layerId]: {
        rows: [{ [columnId]: max }, ...(addEmptyRows ? [{}, {}] : []), { [columnId]: min }],
      },
    } as Record<string, Datatable> | undefined;
  }

  it('should return data bounds for a table', () => {
    expect(
      getDataBounds('layerId', createTable('layerId', 'columnId', { bounds: [5, 10] }), 'columnId')
    ).toEqual({
      min: 5,
      max: 10,
    });
  });

  it('should return no data bounds for empty table', () => {
    expect(getDataBounds('layerId', undefined, 'columnId')).toBeUndefined();
  });

  it('should return no data bounds for missing layer in table', () => {
    expect(
      getDataBounds(
        'layerId',
        createTable('otherLayerId', 'columnId', { bounds: [5, 10] }),
        'columnId'
      )
    ).toBeUndefined();
  });

  it('should return no data bounds for missing column in table', () => {
    expect(
      getDataBounds(
        'layerId',
        createTable('layerId', 'otherColumnId', { bounds: [5, 10] }),
        'columnId'
      )
    ).toBeUndefined();
  });
  it('should be resilient to missing values', () => {
    expect(
      getDataBounds(
        'layerId',
        createTable('layerId', 'columnId', { bounds: [5, 10], addEmptyRows: true }),
        'columnId'
      )
    ).toEqual({
      min: 5,
      max: 10,
    });
  });
  it('should be resilient to single values range', () => {
    expect(
      getDataBounds(
        'layerId',
        createTable('layerId', 'columnId', { bounds: [5, 5], addEmptyRows: true }),
        'columnId'
      )
    ).toEqual({
      min: 5,
      max: 5,
    });
  });
});
