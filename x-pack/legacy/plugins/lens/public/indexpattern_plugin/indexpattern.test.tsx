/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chromeMock from 'ui/chrome';
import { data as dataMock } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { localStorage as storageMock } from 'ui/storage/storage_service';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { toastNotifications as notificationsMock } from 'ui/notify';
import {
  getIndexPatternDatasource,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
  IndexPatternColumn,
} from './indexpattern';
import { DatasourcePublicAPI, Operation, Datasource } from '../types';
import { generateId } from '../id_generator';
import { DataPluginDependencies } from './plugin';

jest.mock('./loader');
jest.mock('../id_generator');
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

describe('IndexPattern Data Source', () => {
  let persistedState: IndexPatternPersistedState;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    indexPatternDatasource = getIndexPatternDatasource({
      chrome: chromeMock,
      storage: storageMock,
      interpreter: { functionsRegistry },
      toastNotifications: notificationsMock,
      data: dataMock as DataPluginDependencies,
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

  describe('#initialize', () => {
    it('should load a default state', async () => {
      const state = await indexPatternDatasource.initialize();
      expect(state).toEqual({
        currentIndexPatternId: '1',
        indexPatterns: expectedIndexPatterns,
        layers: {},
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

  describe('#getPersistedState', () => {
    it('should persist from saved state', async () => {
      const state = await indexPatternDatasource.initialize(persistedState);

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
                label: 'Count of Documents',
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
      const state = await indexPatternDatasource.initialize(queryPersistedState);
      expect(indexPatternDatasource.toExpression(state, 'first')).toMatchInlineSnapshot(`
        "esaggs
              index=\\"1\\"
              metricsAtAllLevels=false
              partialRows=false
              aggConfigs='[{\\"id\\":\\"col1\\",\\"enabled\\":true,\\"type\\":\\"count\\",\\"schema\\":\\"metric\\",\\"params\\":{}},{\\"id\\":\\"col2\\",\\"enabled\\":true,\\"type\\":\\"date_histogram\\",\\"schema\\":\\"segment\\",\\"params\\":{\\"field\\":\\"timestamp\\",\\"useNormalizedEsInterval\\":true,\\"interval\\":\\"1d\\",\\"drop_partials\\":false,\\"min_doc_count\\":1,\\"extended_bounds\\":{}}}]' | lens_rename_columns idMap='{\\"col-0-col1\\":\\"col1\\",\\"col-1-col2\\":\\"col2\\"}'"
      `);
    });
  });

  describe('#getDatasourceSuggestionsForField', () => {
    describe('with no layer', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          layers: {},
        });
        (generateId as jest.Mock).mockReturnValueOnce('suggestedLayer');
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'source', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              suggestedLayer: expect.objectContaining({
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
          layerId: 'suggestedLayer',
        });
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              suggestedLayer: expect.objectContaining({
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
          layerId: 'suggestedLayer',
        });
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              suggestedLayer: expect.objectContaining({
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: expect.objectContaining({
                    operationType: 'date_histogram',
                    sourceField: 'timestamp',
                  }),
                  col2: expect.objectContaining({
                    operationType: 'min',
                    sourceField: 'bytes',
                  }),
                },
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
          layerId: 'suggestedLayer',
        });
      });

      it('should not make any suggestions for a number without a time field', async () => {
        const state: IndexPatternPrivateState = {
          currentIndexPatternId: '1',
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
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
        };

        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(state, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('with a previous empty layer', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columns: {},
              columnOrder: [],
            },
          },
        });
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'source', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: expect.objectContaining({
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
          layerId: 'previousLayer',
        });
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: expect.objectContaining({
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
          layerId: 'previousLayer',
        });
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: expect.objectContaining({
                columnOrder: ['col1', 'col2'],
                columns: {
                  col1: expect.objectContaining({
                    operationType: 'date_histogram',
                    sourceField: 'timestamp',
                  }),
                  col2: expect.objectContaining({
                    operationType: 'min',
                    sourceField: 'bytes',
                  }),
                },
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
          layerId: 'previousLayer',
        });
      });

      it('should not make any suggestions for a number without a time field', async () => {
        const state: IndexPatternPrivateState = {
          currentIndexPatternId: '1',
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
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
        };

        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(state, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(0);
      });
    });

    describe('suggesting extensions to non-empty tables', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        jest.resetAllMocks();
        (generateId as jest.Mock).mockReturnValueOnce('newId');
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          layers: {
            previousLayer: {
              indexPatternId: '2',
              columns: {},
              columnOrder: [],
            },
            currentLayer: {
              indexPatternId: '1',
              columns: {
                col1: {
                  dataType: 'string',
                  isBucketed: true,
                  sourceField: 'source',
                  label: 'values of source',
                  operationType: 'terms',
                  params: {
                    orderBy: { type: 'column', columnId: 'col2' },
                    orderDirection: 'asc',
                    size: 5,
                  },
                },
                col2: {
                  dataType: 'number',
                  isBucketed: false,
                  sourceField: 'bytes',
                  label: 'Min of bytes',
                  operationType: 'min',
                },
              },
              columnOrder: ['col1', 'col2'],
            },
          },
        });
      });

      it('replaces an existing date histogram column on date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(
          {
            ...initialState,
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: {
                ...initialState.layers.currentLayer,
                columns: {
                  col1: {
                    dataType: 'date',
                    isBucketed: true,
                    sourceField: 'timestamp',
                    label: 'date histogram of timestamp',
                    operationType: 'date_histogram',
                    params: {
                      interval: 'w',
                    },
                  },
                  col2: {
                    dataType: 'number',
                    isBucketed: false,
                    sourceField: 'bytes',
                    label: 'Min of bytes',
                    operationType: 'min',
                  },
                },
              },
            },
          },
          {
            field: { name: 'start_date', type: 'date', aggregatable: true, searchable: true },
            indexPatternId: '1',
          }
        );

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
                columnOrder: ['newId', 'col2'],
                columns: {
                  newId: expect.objectContaining({
                    operationType: 'date_histogram',
                    sourceField: 'start_date',
                  }),
                  col2: initialState.layers.currentLayer.columns.col2,
                },
              }),
            },
          })
        );
      });

      it('puts a date histogram column after the last bucket column on date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
                columnOrder: ['col1', 'newId', 'col2'],
                columns: {
                  ...initialState.layers.currentLayer.columns,
                  newId: expect.objectContaining({
                    operationType: 'date_histogram',
                    sourceField: 'timestamp',
                  }),
                },
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
              columnId: 'newId',
            }),
            expect.objectContaining({
              columnId: 'col2',
            }),
          ],
          layerId: 'currentLayer',
        });
      });

      it('does not use the same field for bucketing multiple times', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'source', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(0);
      });

      it('prepends a terms column on string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'dest', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
                columnOrder: ['newId', 'col1', 'col2'],
                columns: {
                  ...initialState.layers.currentLayer.columns,
                  newId: expect.objectContaining({
                    operationType: 'terms',
                    sourceField: 'dest',
                  }),
                },
              }),
            },
          })
        );
      });

      it('appends a metric column on a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'memory', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
                columnOrder: ['col1', 'col2', 'newId'],
                columns: {
                  ...initialState.layers.currentLayer.columns,
                  newId: expect.objectContaining({
                    operationType: 'min',
                    sourceField: 'memory',
                  }),
                },
              }),
            },
          })
        );
      });

      it('appends a metric column with a different operation on a number field if field is already in use', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
                columnOrder: ['col1', 'col2', 'newId'],
                columns: {
                  ...initialState.layers.currentLayer.columns,
                  newId: expect.objectContaining({
                    operationType: 'max',
                    sourceField: 'bytes',
                  }),
                },
              }),
            },
          })
        );
      });
    });

    describe('finding the layer that is using the current index pattern', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          layers: {
            previousLayer: {
              indexPatternId: '1',
              columns: {},
              columnOrder: [],
            },
            currentLayer: {
              indexPatternId: '2',
              columns: {},
              columnOrder: [],
            },
          },
        });
      });

      it('suggests on the layer that matches by indexPatternId', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: {
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
          indexPatternId: '2',
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              previousLayer: initialState.layers.previousLayer,
              currentLayer: expect.objectContaining({
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
          layerId: 'currentLayer',
        });
      });

      it('suggests on the layer with the fewest columns that matches by indexPatternId', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(
          {
            ...initialState,
            layers: {
              ...initialState.layers,
              previousLayer: {
                ...initialState.layers.previousLayer,
                indexPatternId: '1',
              },
            },
          },
          {
            field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
            indexPatternId: '1',
          }
        );

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0].state).toEqual(
          expect.objectContaining({
            layers: {
              currentLayer: initialState.layers.currentLayer,
              previousLayer: expect.objectContaining({
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
              }),
            },
          })
        );
      });
    });
  });

  describe('#getDatasourceSuggestionsFromCurrentState', () => {
    it('returns no suggestions if there are no columns', () => {
      expect(
        indexPatternDatasource.getDatasourceSuggestionsFromCurrentState({
          indexPatterns: expectedIndexPatterns,
          layers: {
            first: {
              indexPatternId: '1',
              columnOrder: [],
              columns: {},
            },
          },
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
                  label: 'My Op',
                  dataType: 'string',
                  isBucketed: true,
                },
              },
            ],
            layerId: 'first',
          },
        },
      ]);
    });
  });

  describe('#insertLayer', () => {
    it('should insert an empty layer into the previous state', () => {
      const state = {
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
      const initialState = await indexPatternDatasource.initialize(persistedState);
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
