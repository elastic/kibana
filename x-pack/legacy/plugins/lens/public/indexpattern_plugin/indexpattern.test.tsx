/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { EuiComboBox } from '@elastic/eui';
import chromeMock from 'ui/chrome';
import { data as dataMock } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { localStorage as storageMock } from 'ui/storage/storage_service';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { toastNotifications as notificationsMock } from 'ui/notify';
import {
  getIndexPatternDatasource,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternDataPanel,
  IndexPatternColumn,
} from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';
import { createMockedDragDropContext } from './mocks';

jest.mock('./loader');
// chrome, notify, storage are used by ./plugin
jest.mock('ui/chrome');
jest.mock('ui/notify');
jest.mock('ui/storage/storage_service');
// Contains old and new platform data plugins, used for interpreter and filter ratio
jest.mock('ui/new_platform');
jest.mock('plugins/data/setup', () => ({ data: { query: { ui: {} } } }));

const expectedIndexPatterns = {
  1: {
    id: '1',
    title: 'my-fake-index-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
      },
    ],
  },
  2: {
    id: '2',
    title: 'my-fake-restricted-pattern',
    timeFieldName: 'timestamp',
    fields: [
      {
        name: 'timestamp',
        type: 'date',
        aggregatable: true,
        searchable: true,
        aggregationRestrictions: {
          date_histogram: {
            agg: 'date_histogram',
            fixed_interval: '1d',
            delay: '7d',
            time_zone: 'UTC',
          },
        },
      },
      {
        name: 'bytes',
        type: 'number',
        aggregatable: true,
        searchable: true,
        aggregationRestrictions: {
          // Ignored in the UI
          histogram: {
            agg: 'histogram',
            interval: 1000,
          },
          avg: {
            agg: 'avg',
          },
          max: {
            agg: 'max',
          },
          min: {
            agg: 'min',
          },
          sum: {
            agg: 'sum',
          },
        },
      },
      {
        name: 'source',
        type: 'string',
        aggregatable: true,
        searchable: true,
        aggregationRestrictions: {
          terms: {
            agg: 'terms',
          },
        },
      },
    ],
  },
};

describe('IndexPattern Data Source', () => {
  let persistedState: IndexPatternPersistedState;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    indexPatternDatasource = getIndexPatternDatasource({
      chrome: chromeMock,
      storage: storageMock,
      interpreter: { functionsRegistry },
      toastNotifications: notificationsMock,
      data: dataMock,
    });

    persistedState = {
      currentIndexPatternId: '1',
      columnOrder: ['col1'],
      columns: {
        col1: {
          operationId: 'op1',
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,

          // Private
          operationType: 'terms',
          sourceField: 'op',
          params: {
            size: 5,
            orderBy: { type: 'alphabetical' },
            orderDirection: 'asc',
          },
        },
      },
    };
  });

  describe('#initialize', () => {
    it('should load a default state', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(state).toEqual({
        currentIndexPatternId: '1',
        indexPatterns: expectedIndexPatterns,
        columns: {},
        columnOrder: [],
      });
    });

    it('should initialize from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);
      expect(state).toEqual({
        ...persistedState,
        indexPatterns: expectedIndexPatterns,
      });
    });
  });

  describe('#renderDataPanel', () => {
    let state: IndexPatternPrivateState;

    beforeEach(async () => {
      state = await indexPatternDatasource.initialize(persistedState);
    });

    it('should match snapshot', () => {
      expect(
        shallow(
          <IndexPatternDataPanel
            dragDropContext={createMockedDragDropContext()}
            state={state}
            setState={() => {}}
          />
        )
      ).toMatchSnapshot();
    });

    it('should call setState when the index pattern is switched', async () => {
      const setState = jest.fn();

      const wrapper = shallow(
        <IndexPatternDataPanel
          dragDropContext={createMockedDragDropContext()}
          {...{ state, setState }}
        />
      );

      const comboBox = wrapper.find(EuiComboBox);

      comboBox.prop('onChange')!([
        {
          label: expectedIndexPatterns['2'].title,
          value: '2',
        },
      ]);

      expect(setState).toHaveBeenCalledWith({
        ...state,
        currentIndexPatternId: '2',
      });
    });
  });

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);

      expect(indexPatternDatasource.getPersistableState(state)).toEqual(persistedState);
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(indexPatternDatasource.toExpression(state)).toEqual(null);
    });

    it('should generate an expression for an aggregated query', async () => {
      const queryPersistedState: IndexPatternPersistedState = {
        currentIndexPatternId: '1',
        columnOrder: ['col1', 'col2'],
        columns: {
          col1: {
            operationId: 'op1',
            label: 'Count of Documents',
            dataType: 'number',
            isBucketed: false,

            // Private
            operationType: 'count',
          },
          col2: {
            operationId: 'op2',
            label: 'Date',
            dataType: 'date',
            isBucketed: true,

            // Private
            operationType: 'date_histogram',
            sourceField: 'timestamp',
            params: {
              interval: '1d',
            },
          },
        },
      };
      const state = await indexPatternDatasource.initialize(queryPersistedState);
      expect(indexPatternDatasource.toExpression(state)).toMatchInlineSnapshot(`
"esaggs
      index=\\"1\\"
      metricsAtAllLevels=false
      partialRows=false
      aggConfigs='[{\\"id\\":\\"col1\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}},{\\"id\\":\\"col2\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"timestamp\\",\\"timeRange\\":{\\"from\\":\\"now-1d\\",\\"to\\":\\"now\\"},\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"1d\\",\\"drop_partials\\":false,\\"min_doc_count\\":1,\\"extended_bounds\\":{}}}]' | lens_rename_columns idMap='{\\"col-0-col1\\":\\"col1\\",\\"col-1-col2\\":\\"col2\\"}'"
`);
    });
  });

  describe('#getDatasourceSuggestionsForField', () => {
    describe('with no previous selections', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          columnOrder: [],
          columns: {},
        });
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'source',
          type: 'string',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                operationType: 'terms',
                sourceField: 'source',
              }),
              col2: expect.objectContaining({
                operationType: 'count',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'timestamp',
          type: 'date',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                operationType: 'date_histogram',
                sourceField: 'timestamp',
              }),
              col2: expect.objectContaining({
                operationType: 'count',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: expect.objectContaining({
                sourceField: 'timestamp',
                operationType: 'date_histogram',
              }),
              col2: expect.objectContaining({
                sourceField: 'bytes',
                operationType: 'min',
              }),
            },
          })
        );
        expect(suggestions[0].table).toEqual({
          datasourceSuggestionId: 0,
          isMultiRow: true,
          columns: [
            expect.objectContaining({
              columnId: 'col1',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
        });
      });

      it('should not make any suggestions for a number without a time field', async () => {
        const state: IndexPatternPrivateState = {
          currentIndexPatternId: '1',
          columnOrder: [],
          columns: {},
          indexPatterns: {
            1: {
              id: '1',
              title: 'no timefield',
              fields: [
                {
                  name: 'bytes',
                  type: 'number',
                  aggregatable: true,
                  searchable: true,
                },
              ],
            },
          },
        };

        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(state, {
          name: 'bytes',
          type: 'number',
          aggregatable: true,
          searchable: true,
        });

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('with a prior column', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize(persistedState);
      });

      it('should not suggest for string', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'source',
            type: 'string',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });

      it('should not suggest for date', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'timestamp',
            type: 'date',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });

      it('should not suggest for number', () => {
        expect(
          indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
            name: 'bytes',
            type: 'number',
            aggregatable: true,
            searchable: true,
          })
        ).toHaveLength(0);
      });
    });
  });

  describe('#getDatasourceSuggestionsFromCurrentState', () => {
    it('returns no suggestions if there are no columns', () => {
      expect(
        indexPatternDatasource.getDatasourceSuggestionsFromCurrentState({
          indexPatterns: expectedIndexPatterns,
          columnOrder: [],
          columns: {},
          currentIndexPatternId: '1',
        })
      ).toEqual([]);
    });

    it('returns a single suggestion containing the current columns', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);
      expect(indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state)).toEqual([
        {
          state: {
            ...persistedState,
            indexPatterns: expectedIndexPatterns,
          },
          table: {
            datasourceSuggestionId: 0,
            isMultiRow: true,
            columns: [
              {
                columnId: 'col1',
                operation: {
                  id: 'op1',
                  label: 'My Op',
                  dataType: 'string',
                  isBucketed: true,
                },
              },
            ],
          },
        },
      ]);
    });
  });

  describe('#getPublicAPI', () => {
    let publicAPI: DatasourcePublicAPI;

    beforeEach(async () => {
      const initialState = await indexPatternDatasource.initialize(persistedState);
      publicAPI = indexPatternDatasource.getPublicAPI(initialState, () => {});
    });

    describe('getTableSpec', () => {
      it('should include col1', () => {
        expect(publicAPI.getTableSpec()).toEqual([
          {
            columnId: 'col1',
          },
        ]);
      });
    });

    describe('removeColumnInTableSpec', () => {
      it('should remove the specified column', async () => {
        const initialState = await indexPatternDatasource.initialize(persistedState);
        const setState = jest.fn();
        const sampleColumn: IndexPatternColumn = {
          dataType: 'number',
          isBucketed: false,
          label: 'foo',
          operationId: 'bar',
          operationType: 'max',
          sourceField: 'baz',
          suggestedOrder: 0,
        };
        const columns: Record<string, IndexPatternColumn> = {
          a: {
            ...sampleColumn,
            suggestedOrder: 0,
          },
          b: {
            ...sampleColumn,
            suggestedOrder: 1,
          },
          c: {
            ...sampleColumn,
            suggestedOrder: 2,
          },
        };
        const api = indexPatternDatasource.getPublicAPI(
          {
            ...initialState,
            columnOrder: ['a', 'b', 'c'],
            columns,
          },
          setState
        );

        api.removeColumnInTableSpec('b');

        expect(setState.mock.calls[0][0].columnOrder).toEqual(['a', 'c']);
        expect(setState.mock.calls[0][0].columns).toEqual({
          a: columns.a,
          c: columns.c,
        });
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
          id: 'op1',
          label: 'My Op',
          dataType: 'string',
          isBucketed: true,
        } as Operation);
      });

      it('should return null for non-existant columns', () => {
        expect(publicAPI.getOperationForColumnId('col2')).toBe(null);
      });
    });
  });
});
