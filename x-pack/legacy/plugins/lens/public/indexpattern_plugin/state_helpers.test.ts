/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  updateColumnParam,
  changeColumn,
  getColumnOrder,
  deleteColumn,
  updateLayerIndexPattern,
} from './state_helpers';
import { operationDefinitionMap } from './operations';
import { TermsIndexPatternColumn } from './operations/definitions/terms';
import { DateHistogramIndexPatternColumn } from './operations/definitions/date_histogram';
import { AvgIndexPatternColumn } from './operations/definitions/metrics';
import { IndexPattern, IndexPatternPrivateState, IndexPatternLayer } from './types';

jest.mock('ui/new_platform');
jest.mock('./operations');

describe('state_helpers', () => {
  describe('deleteColumn', () => {
    it('should remove column', () => {
      const termsColumn: TermsIndexPatternColumn = {
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
      };

      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
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
      };

      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
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
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
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
        updateColumnParam({
          state,
          layerId: 'first',
          currentColumn,
          paramName: 'interval',
          value: 'M',
        }).layers.first.columns.col1
      ).toEqual({
        ...currentColumn,
        params: { interval: 'M' },
      });
    });
  });

  describe('changeColumn', () => {
    it('should update order on changing the column', () => {
      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'Average of bytes',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'avg',
                sourceField: 'bytes',
              },
              col2: {
                label: 'Max of bytes',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'max',
                sourceField: 'bytes',
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
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            params: {
              interval: '1d',
            },
            sourceField: 'timestamp',
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
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
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
          },
        },
      };
      expect(
        changeColumn({
          state,
          layerId: 'first',
          columnId: 'col2',
          newColumn: {
            label: 'Date histogram of order_date',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'order_date',
            params: {
              interval: 'w',
            },
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
      };

      const newColumn: AvgIndexPatternColumn = {
        label: 'Average of bytes',
        dataType: 'number',
        isBucketed: false,

        // Private
        operationType: 'avg',
        sourceField: 'bytes',
      };

      const state: IndexPatternPrivateState = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        currentIndexPatternId: '1',
        showEmptyFields: false,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: termsColumn,
              col2: {
                label: 'Count',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
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
            label: 'Top values of category',
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
          },
          col2: {
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
          },
          col3: {
            label: 'Date histogram of timestamp',
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
            label: 'Top values of category',
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
          },
          col2: {
            label: 'Average of bytes',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'avg',
            sourceField: 'bytes',
            suggestedPriority: 0,
          },
          col3: {
            label: 'Date histogram of timestamp',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            suggestedPriority: 1,
            params: {
              interval: '1d',
            },
          },
        })
      ).toEqual(['col3', 'col1', 'col2']);
    });
  });

  describe('updateLayerIndexPattern', () => {
    const indexPattern: IndexPattern = {
      id: 'test',
      title: '',
      fields: [
        {
          name: 'fieldA',
          aggregatable: true,
          searchable: true,
          type: 'string',
        },
        {
          name: 'fieldB',
          aggregatable: true,
          searchable: true,
          type: 'number',
          aggregationRestrictions: {
            avg: {
              agg: 'avg',
            },
          },
        },
        {
          name: 'fieldC',
          aggregatable: false,
          searchable: true,
          type: 'date',
        },
        {
          name: 'fieldD',
          aggregatable: true,
          searchable: true,
          type: 'date',
          aggregationRestrictions: {
            date_histogram: {
              agg: 'date_histogram',
              time_zone: 'CET',
              calendar_interval: 'w',
            },
          },
        },
        {
          name: 'fieldE',
          aggregatable: true,
          searchable: true,
          type: 'date',
        },
      ],
    };

    it('should switch index pattern id in layer', () => {
      const layer = { columnOrder: [], columns: {}, indexPatternId: 'original' };
      expect(updateLayerIndexPattern(layer, indexPattern)).toEqual({
        ...layer,
        indexPatternId: 'test',
      });
    });

    it('should remove operations referencing unavailable fields', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
            sourceField: 'xxx',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, indexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });

    it('should remove operations referencing fields with insufficient capabilities', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'fieldC',
            params: {
              interval: 'd',
            },
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
            sourceField: 'fieldB',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, indexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col2']);
      expect(updatedLayer.columns).toEqual({
        col2: layer.columns.col2,
      });
    });

    it('should rewrite column params if that is necessary due to restrictions', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'date',
            isBucketed: true,
            label: '',
            operationType: 'date_histogram',
            sourceField: 'fieldD',
            params: {
              interval: 'd',
            },
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, indexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: {
          ...layer.columns.col1,
          params: {
            interval: 'w',
            timeZone: 'CET',
          },
        },
      });
    });

    it('should remove operations referencing fields with wrong field types', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'avg',
            sourceField: 'fieldD',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, indexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });

    it('should remove operations referencing fields with incompatible restrictions', () => {
      const layer: IndexPatternLayer = {
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            dataType: 'string',
            isBucketed: true,
            label: '',
            operationType: 'terms',
            sourceField: 'fieldA',
            params: {
              orderBy: { type: 'alphabetical' },
              orderDirection: 'asc',
              size: 3,
            },
          },
          col2: {
            dataType: 'number',
            isBucketed: false,
            label: '',
            operationType: 'min',
            sourceField: 'fieldC',
          },
        },
        indexPatternId: 'original',
      };
      const updatedLayer = updateLayerIndexPattern(layer, indexPattern);
      expect(updatedLayer.columnOrder).toEqual(['col1']);
      expect(updatedLayer.columns).toEqual({
        col1: layer.columns.col1,
      });
    });
  });
});
