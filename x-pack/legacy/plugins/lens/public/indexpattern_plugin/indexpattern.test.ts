/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chromeMock from 'ui/chrome';
import { Storage } from 'ui/storage';
import { SavedObjectsClientContract } from 'kibana/public';
import { getIndexPatternDatasource, IndexPatternColumn, uniqueLabels } from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';
import { coreMock } from 'src/core/public/mocks';
import { pluginsMock } from 'ui/new_platform/__mocks__/helpers';
import { IndexPatternPersistedState, IndexPatternPrivateState } from './types';

jest.mock('./loader');
jest.mock('../id_generator');
// chrome, notify, storage are used by ./plugin
jest.mock('ui/chrome');
// Contains old and new platform data plugins, used for interpreter and filter ratio
jest.mock('ui/new_platform');

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
        name: 'start_date',
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
        name: 'memory',
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
      {
        name: 'dest',
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

function stateFromPersistedState(
  persistedState: IndexPatternPersistedState
): IndexPatternPrivateState {
  return {
    currentIndexPatternId: persistedState.currentIndexPatternId,
    layers: persistedState.layers,
    indexPatterns: expectedIndexPatterns,
    indexPatternRefs: [],
    existingFields: {},
    showEmptyFields: true,
  };
}

describe('IndexPattern Data Source', () => {
  let persistedState: IndexPatternPersistedState;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    indexPatternDatasource = getIndexPatternDatasource({
      chrome: chromeMock,
      storage: {} as Storage,
      core: coreMock.createStart(),
      savedObjectsClient: {} as SavedObjectsClientContract,
      data: pluginsMock.createStart().data,
    });

    persistedState = {
      currentIndexPatternId: '1',
      layers: {
        first: {
          indexPatternId: '1',
          columnOrder: ['col1'],
          columns: {
            col1: {
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
        },
      },
    };
  });

  describe('uniqueLabels', () => {
    it('appends a suffix to duplicates', () => {
      const col: IndexPatternColumn = {
        dataType: 'number',
        isBucketed: false,
        label: 'Foo',
        operationType: 'count',
      };
      const map = uniqueLabels({
        a: {
          columnOrder: ['a', 'b'],
          columns: {
            a: col,
            b: col,
          },
          indexPatternId: 'foo',
        },
        b: {
          columnOrder: ['c', 'd'],
          columns: {
            c: col,
            d: {
              ...col,
              label: 'Foo [1]',
            },
          },
          indexPatternId: 'foo',
        },
      });

      expect(map).toMatchInlineSnapshot(`
        Object {
          "a": "Foo",
          "b": "Foo [1]",
          "c": "Foo [2]",
          "d": "Foo [1] [1]",
        }
      `);
    });
  });

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      const state = stateFromPersistedState(persistedState);

      expect(indexPatternDatasource.getPersistableState(state)).toEqual(persistedState);
    });
  });

  describe('#toExpression', () => {
    it('should generate an empty expression when no columns are selected', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(indexPatternDatasource.toExpression(state, 'first')).toEqual(null);
    });

    it('should generate an expression for an aggregated query', async () => {
      const queryPersistedState: IndexPatternPersistedState = {
        currentIndexPatternId: '1',
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'Count of records',
                dataType: 'number',
                isBucketed: false,

                // Private
                operationType: 'count',
              },
              col2: {
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
          },
        },
      };

      const state = stateFromPersistedState(queryPersistedState);

      expect(indexPatternDatasource.toExpression(state, 'first')).toMatchInlineSnapshot(`
        "esaggs
              index=\\"1\\"
              metricsAtAllLevels=false
              partialRows=false
              includeFormatHints=true
              aggConfigs={lens_auto_date aggConfigs='[{\\"id\\":\\"col1\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}},{\\"id\\":\\"col2\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"timestamp\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"1d\\",\\"drop_partials\\":false,\\"min_doc_count\\":0,\\"extended_bounds\\":{}}}]'} | lens_rename_columns idMap='{\\"col-0-col1\\":{\\"label\\":\\"Count of records\\",\\"dataType\\":\\"number\\",\\"isBucketed\\":false,\\"operationType\\":\\"count\\",\\"id\\":\\"col1\\"},\\"col-1-col2\\":{\\"label\\":\\"Date\\",\\"dataType\\":\\"date\\",\\"isBucketed\\":true,\\"operationType\\":\\"date_histogram\\",\\"sourceField\\":\\"timestamp\\",\\"params\\":{\\"interval\\":\\"1d\\"},\\"id\\":\\"col2\\"}}'"
      `);
    });
  });

  describe('#insertLayer', () => {
    it('should insert an empty layer into the previous state', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
        showEmptyFields: false,
      };
      expect(indexPatternDatasource.insertLayer(state, 'newLayer')).toEqual({
        ...state,
        layers: {
          ...state.layers,
          newLayer: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
        },
      });
    });
  });

  describe('#removeLayer', () => {
    it('should remove a layer', () => {
      const state = {
        indexPatternRefs: [],
        existingFields: {},
        showEmptyFields: false,
        indexPatterns: expectedIndexPatterns,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: [],
            columns: {},
          },
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
        currentIndexPatternId: '1',
      };
      expect(indexPatternDatasource.removeLayer(state, 'first')).toEqual({
        ...state,
        layers: {
          second: {
            indexPatternId: '2',
            columnOrder: [],
            columns: {},
          },
        },
      });
    });
  });

  describe('#getLayers', () => {
    it('should list the current layers', () => {
      expect(
        indexPatternDatasource.getLayers({
          indexPatternRefs: [],
          existingFields: {},
          showEmptyFields: false,
          indexPatterns: expectedIndexPatterns,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
            second: {
              indexPatternId: '2',
              columnOrder: [],
              columns: {},
            },
          },
          currentIndexPatternId: '1',
        })
      ).toEqual(['first', 'second']);
    });
  });

  describe('#getMetadata', () => {
    it('should return the title of the index patterns', () => {
      expect(
        indexPatternDatasource.getMetaData({
          indexPatternRefs: [],
          existingFields: {},
          showEmptyFields: false,
          indexPatterns: expectedIndexPatterns,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
            second: {
              indexPatternId: '2',
              columnOrder: [],
              columns: {},
            },
          },
          currentIndexPatternId: '1',
        })
      ).toEqual({
        filterableIndexPatterns: [
          {
            id: '1',
            title: 'my-fake-index-pattern',
          },
          {
            id: '2',
            title: 'my-fake-restricted-pattern',
          },
        ],
      });
    });
  });

  describe('#getPublicAPI', () => {
    let publicAPI: DatasourcePublicAPI;

    beforeEach(async () => {
      const initialState = stateFromPersistedState(persistedState);
      publicAPI = indexPatternDatasource.getPublicAPI(initialState, () => {}, 'first');
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
          operationType: 'max',
          sourceField: 'baz',
          suggestedPriority: 0,
        };
        const columns: Record<string, IndexPatternColumn> = {
          a: {
            ...sampleColumn,
            suggestedPriority: 0,
          },
          b: {
            ...sampleColumn,
            suggestedPriority: 1,
          },
          c: {
            ...sampleColumn,
            suggestedPriority: 2,
          },
        };
        const api = indexPatternDatasource.getPublicAPI(
          {
            ...initialState,
            layers: {
              first: {
                ...initialState.layers.first,
                columns,
                columnOrder: ['a', 'b', 'c'],
              },
            },
          },
          setState,
          'first'
        );

        api.removeColumnInTableSpec('b');

        expect(setState.mock.calls[0][0].layers.first.columnOrder).toEqual(['a', 'c']);
        expect(setState.mock.calls[0][0].layers.first.columns).toEqual({
          a: columns.a,
          c: columns.c,
        });
      });
    });

    describe('getOperationForColumnId', () => {
      it('should get an operation for col1', () => {
        expect(publicAPI.getOperationForColumnId('col1')).toEqual({
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
