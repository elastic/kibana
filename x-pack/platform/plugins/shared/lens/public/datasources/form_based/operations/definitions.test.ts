/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AvgIndexPatternColumn,
  DerivativeIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  FormBasedLayer,
  IndexPattern,
  IndexPatternField,
  GenericIndexPatternColumn,
} from '@kbn/lens-common';
import {
  sumOperation,
  averageOperation,
  countOperation,
  counterRateOperation,
  movingAverageOperation,
  cumulativeSumOperation,
  derivativeOperation,
} from './definitions';
import { getFieldByNameFactory } from '../pure_helpers';
import { documentField } from '../document_field';

const indexPatternFields = [
  {
    name: 'timestamp',
    displayName: 'timestampLabel',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'start_date',
    displayName: 'start_date',
    type: 'date',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'bytes',
    displayName: 'bytesLabel',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'memory',
    displayName: 'memory',
    type: 'number',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'source',
    displayName: 'source',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  {
    name: 'dest',
    displayName: 'dest',
    type: 'string',
    aggregatable: true,
    searchable: true,
  },
  documentField,
];

const indexPattern = {
  id: '1',
  title: 'my-fake-index-pattern',
  timeFieldName: 'timestamp',
  hasRestrictions: false,
  fields: indexPatternFields,
  getFieldByName: getFieldByNameFactory([...indexPatternFields]),
  getFormatterForField: () => ({ convert: (v: unknown) => v }),
  isPersisted: true,
  spec: {},
};

const baseColumnArgs: {
  previousColumn: GenericIndexPatternColumn;
  indexPattern: IndexPattern;
  layer: FormBasedLayer;
  field: IndexPatternField;
} = {
  previousColumn: {
    label: 'Count of records per hour',
    timeScale: 'h',
    dataType: 'number',
    isBucketed: false,

    // Private
    operationType: 'count',
    sourceField: '___records___',
  },
  indexPattern,
  layer: {
    columns: {},
    columnOrder: [],
    indexPatternId: '1',
  },
  field: indexPattern.fields[2],
};

const layer: FormBasedLayer = {
  indexPatternId: '1',
  columnOrder: ['date', 'metric', 'ref'],
  columns: {
    date: {
      label: '',
      customLabel: true,
      dataType: 'date',
      isBucketed: true,
      operationType: 'date_histogram',
      sourceField: 'timestamp',
      params: { interval: 'auto' },
    } as DateHistogramIndexPatternColumn,
    metric: {
      label: 'metricLabel',
      customLabel: true,
      dataType: 'number',
      isBucketed: false,
      operationType: 'average',
      sourceField: 'bytes',
      params: {},
    } as AvgIndexPatternColumn,
    ref: {
      label: '',
      dataType: 'number',
      isBucketed: false,
      operationType: 'differences',
      references: ['metric'],
    } as DerivativeIndexPatternColumn,
  },
};

describe('labels', () => {
  const calcColumnArgs = {
    ...baseColumnArgs,
    referenceIds: ['metric'],
    layer,
    previousColumn: layer.columns.metric,
  };
  it('should use custom label of referenced operation to create label for derivative and moving average', () => {
    const derivativeColumn = derivativeOperation.buildColumn(calcColumnArgs);
    expect(derivativeColumn.label).toBe('Differences of metricLabel');
    expect(derivativeOperation.getDefaultLabel(derivativeColumn, layer.columns, indexPattern)).toBe(
      'Differences of metricLabel'
    );

    const movingAverageColumn = movingAverageOperation.buildColumn(calcColumnArgs);
    expect(movingAverageColumn.label).toBe('Moving average of metricLabel');
    expect(
      movingAverageOperation.getDefaultLabel(movingAverageColumn, layer.columns, indexPattern)
    ).toBe('Moving average of metricLabel');
  });

  it('should use displayName of a field for a label for counter rate and cumulative sum', () => {
    const counterRateColumn = counterRateOperation.buildColumn(calcColumnArgs);
    expect(
      counterRateOperation.getDefaultLabel(counterRateColumn, layer.columns, indexPattern)
    ).toBe('Counter rate of bytesLabel per second');

    const cumulativeSumColumn = cumulativeSumOperation.buildColumn(calcColumnArgs);
    expect(
      cumulativeSumOperation.getDefaultLabel(cumulativeSumColumn, layer.columns, indexPattern)
    ).toBe('Cumulative sum of bytesLabel');
  });
});

describe('time scale transition', () => {
  it('should carry over time scale and adjust label on operation from count to sum', () => {
    const column = sumOperation.buildColumn({
      ...baseColumnArgs,
    });
    expect(column.timeScale).toBe('h');
    expect(sumOperation.getDefaultLabel(column, {}, indexPattern)).toBe(
      'Sum of bytesLabel per hour'
    );
  });

  it('should carry over time scale and adjust label on operation from count to calculation', () => {
    const counterRateResult = counterRateOperation.buildColumn({
      ...baseColumnArgs,
      referenceIds: [],
    });
    expect(counterRateResult.timeScale).toEqual('h');
    expect(counterRateOperation.getDefaultLabel(counterRateResult, {}, indexPattern)).toContain(
      'per hour'
    );

    const movingAverageResult = movingAverageOperation.buildColumn({
      ...baseColumnArgs,
      referenceIds: [],
    });
    expect(movingAverageResult.timeScale).toEqual('h');
    expect(movingAverageOperation.getDefaultLabel(movingAverageResult, {}, indexPattern)).toContain(
      'per hour'
    );

    const derivativeResult = derivativeOperation.buildColumn({
      ...baseColumnArgs,
      referenceIds: [],
    });
    expect(derivativeResult.timeScale).toEqual('h');
    expect(derivativeOperation.getDefaultLabel(derivativeResult, {}, indexPattern)).toContain(
      'per hour'
    );
  });

  it('should not set time scale if it was not set previously', () => {
    const column = countOperation.buildColumn({
      ...baseColumnArgs,
      previousColumn: {
        label: 'Sum of bytes',
        dataType: 'number',
        isBucketed: false,
        operationType: 'sum',
        sourceField: 'bytes',
      },
    });
    expect(column.timeScale).toBeUndefined();
    expect(countOperation.getDefaultLabel(column, {}, indexPattern)).toBe('Count of bytesLabel');
  });

  it('should set time scale to default for counter rate', () => {
    expect(
      counterRateOperation.buildColumn({
        indexPattern,
        layer: {
          columns: {},
          columnOrder: [],
          indexPatternId: '1',
        },
        referenceIds: [],
      })
    ).toEqual(
      expect.objectContaining({
        timeScale: 's',
      })
    );
  });

  it('should adjust label on field change', () => {
    const resultColumn = sumOperation.onFieldChange(
      {
        label: 'Sum of bytesLabel per hour',
        timeScale: 'h',
        dataType: 'number',
        isBucketed: false,

        // Private
        operationType: 'sum',
        sourceField: 'bytes',
      },
      indexPattern.fields[3]
    );
    expect(resultColumn.timeScale).toBe('h');
    expect(sumOperation.getDefaultLabel(resultColumn, {}, indexPattern)).toBe(
      'Sum of memory per hour'
    );
  });

  it('should not carry over time scale if target does not support time scaling', () => {
    const result = averageOperation.buildColumn({
      ...baseColumnArgs,
    });
    expect(result.timeScale).toBeUndefined();
  });
});
