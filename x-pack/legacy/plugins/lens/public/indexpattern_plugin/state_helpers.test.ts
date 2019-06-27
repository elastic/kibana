/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateColumnParam, getColumnOrder, changeColumn } from './state_helpers';
import { IndexPatternPrivateState, DateHistogramIndexPatternColumn } from './indexpattern';

describe('state_helpers', () => {
  describe('updateColumnParam', () => {
    it('should set the param for the given column', () => {
      const currentColumn: DateHistogramIndexPatternColumn = {
        operationId: 'op1',
        label: 'Value of timestamp',
        dataType: 'date',
        isBucketed: true,

        // Private
        operationType: 'date_histogram',
        params: {
          interval: '1d',
        },
        sourceField: 'timestamp',
      };

      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: currentColumn,
        },
      };

      expect(updateColumnParam(state, currentColumn, 'interval', 'M').columns.col1).toEqual({
        ...currentColumn,
        params: { interval: 'M' },
      });
    });
  });

  describe('changeColumn', () => {
    it('should update order on changing the column', () => {
      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
          },
          col2: {
            operationId: 'op1',
            label: 'Max of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'max',
            sourceField: 'bytes',
          },
        },
      };
      expect(
        changeColumn(state, 'col2', {
          operationId: 'op1',
          label: 'Date histogram of timestamp',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          params: {
            interval: '1d',
          },
          sourceField: 'timestamp',
        })
      ).toEqual(
        expect.objectContaining({
          columnOrder: ['col2', 'col1'],
        })
      );
    });

    it('should carry over params from old column if the operation type stays the same', () => {
      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        columnOrder: ['col1'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          },
        },
      };
      expect(
        changeColumn(state, 'col2', {
          operationId: 'op2',
          label: 'Date histogram of order_date',
          dataType: 'date',
          isBucketed: true,

          // Private
          operationType: 'date_histogram',
          sourceField: 'order_date',
          params: {
            interval: 'w',
          },
        }).columns.col1
      ).toEqual(
        expect.objectContaining({
          params: { interval: 'h' },
        })
      );
    });
  });

  describe('getColumnOrder', () => {
    it('should work for empty columns', () => {
      expect(getColumnOrder({})).toEqual([]);
    });

    it('should work for one column', () => {
      expect(
        getColumnOrder({
          col1: {
            operationId: 'op1',
            label: 'Value of timestamp',
            dataType: 'string',
            isBucketed: false,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: 'h',
            },
          },
        })
      ).toEqual(['col1']);
    });

    it('should put any number of aggregations before metrics', () => {
      expect(
        getColumnOrder({
          col1: {
            operationId: 'op1',
            label: 'Top Values of category',
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'category',
            params: {
              size: 5,
              orderBy: {
                type: 'alphabetical',
              },
            },
          },
          col2: {
            operationId: 'op2',
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
          },
          col3: {
            operationId: 'op3',
            label: 'Date Histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: '1d',
            },
          },
        })
      ).toEqual(['col1', 'col3', 'col2']);
    });

    it('should reorder aggregations based on suggested priority', () => {
      expect(
        getColumnOrder({
          col1: {
            operationId: 'op1',
            label: 'Top Values of category',
            dataType: 'string',
            isBucketed: true,

            // Private
            operationType: 'terms',
            sourceField: 'category',
            params: {
              size: 5,
              orderBy: {
                type: 'alphabetical',
              },
            },
            suggestedOrder: 2,
          },
          col2: {
            operationId: 'op2',
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
            suggestedOrder: 0,
          },
          col3: {
            operationId: 'op3',
            label: 'Date Histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            suggestedOrder: 1,
            params: {
              interval: '1d',
            },
          },
        })
      ).toEqual(['col3', 'col1', 'col2']);
    });
  });
});
