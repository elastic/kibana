/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { updateColumnParam, changeColumn, getColumnOrder, deleteColumn } from './state_helpers';
import {
  IndexPatternPrivateState,
  DateHistogramIndexPatternColumn,
  TermsIndexPatternColumn,
  AvgIndexPatternColumn,
} from './indexpattern';
import { operationDefinitionMap } from './operations';

jest.mock('./operations');

describe('state_helpers', () => {
  describe('deleteColumn', () => {
    it('should remove column', () => {
      const termsColumn: TermsIndexPatternColumn = {
        operationId: 'op2',
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          size: 5,
        },
        indexPatternId: '',
      };

      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                operationId: 'op1',
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
                indexPatternId: '1',
              },
            },
          },
        },
      };

      expect(
        deleteColumn({ state, columnId: 'col2', layerId: 'first' }).layers.first.columns
      ).toEqual({
        col1: termsColumn,
      });
    });

    it('should execute adjustments for other columns', () => {
      const termsColumn: TermsIndexPatternColumn = {
        operationId: 'op2',
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          size: 5,
        },
        indexPatternId: '',
      };

      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                operationId: 'op1',
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
                indexPatternId: '1',
              },
            },
          },
        },
      };

      deleteColumn({
        state,
        columnId: 'col2',
        layerId: 'first',
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(termsColumn, {
        col1: termsColumn,
      });
    });
  });

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
        indexPatternId: '1',
      };

      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: currentColumn,
            },
          },
        },
      };

      expect(
        updateColumnParam(state, 'first', currentColumn, 'interval', 'M').layers.first.columns.col1
      ).toEqual({
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
        layers: {
          first: {
            indexPatternId: '1',
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
                indexPatternId: '1',
              },
              col2: {
                operationId: 'op1',
                label: 'Max of bytes',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'max',
                sourceField: 'bytes',
                indexPatternId: '1',
              },
            },
          },
        },
      };
      expect(
        changeColumn({
          state,
          columnId: 'col2',
          layerId: 'first',
          newColumn: {
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
            indexPatternId: '1',
          },
        })
      ).toEqual({
        ...state,
        layers: {
          first: expect.objectContaining({
            columnOrder: ['col2', 'col1'],
          }),
        },
      });
    });

    it('should carry over params from old column if the operation type stays the same', () => {
      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
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
                indexPatternId: '1',
              },
            },
          },
        },
      };
      expect(
        changeColumn({
          state,
          layerId: 'first',
          columnId: 'col2',
          newColumn: {
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
            indexPatternId: '1',
          },
        }).layers.first.columns.col1
      ).toEqual(
        expect.objectContaining({
          params: { interval: 'h' },
        })
      );
    });

    it('should execute adjustments for other columns', () => {
      const termsColumn: TermsIndexPatternColumn = {
        operationId: 'op2',
        label: 'Top values of source',
        dataType: 'string',
        isBucketed: true,

        // Private
        operationType: 'terms',
        sourceField: 'source',
        params: {
          orderBy: { type: 'alphabetical' },
          orderDirection: 'asc',
          size: 5,
        },
        indexPatternId: '1',
      };

      const newColumn: AvgIndexPatternColumn = {
        operationId: 'op1',
        label: 'Average of bytes',
        dataType: 'number',
        isBucketed: false,

        // Private
        operationType: 'avg',
        sourceField: 'bytes',
        indexPatternId: '1',
      };

      const state: IndexPatternPrivateState = {
        indexPatterns: {},
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                operationId: 'op1',
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
                indexPatternId: '1',
              },
            },
          },
        },
      };

      changeColumn({
        state,
        layerId: 'first',
        columnId: 'col2',
        newColumn,
      });

      expect(operationDefinitionMap.terms.onOtherColumnChanged).toHaveBeenCalledWith(termsColumn, {
        col1: termsColumn,
        col2: newColumn,
      });
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
            indexPatternId: '1',
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
              orderDirection: 'asc',
            },
            indexPatternId: '1',
          },
          col2: {
            operationId: 'op2',
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
            indexPatternId: '1',
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
            indexPatternId: '1',
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
              orderDirection: 'asc',
            },
            suggestedPriority: 2,
            indexPatternId: '1',
          },
          col2: {
            operationId: 'op2',
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
            suggestedPriority: 0,
            indexPatternId: '1',
          },
          col3: {
            operationId: 'op3',
            label: 'Date Histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            suggestedPriority: 1,
            params: {
              interval: '1d',
            },
            indexPatternId: '1',
          },
        })
      ).toEqual(['col3', 'col1', 'col2']);
    });
  });
});
