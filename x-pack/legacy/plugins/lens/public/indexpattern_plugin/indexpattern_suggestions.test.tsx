/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chromeMock from 'ui/chrome';
import { data as dataMock } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { SavedObjectsClientContract } from 'src/core/public';
import {
  getIndexPatternDatasource,
  IndexPatternPersistedState,
  IndexPatternPrivateState,
} from './indexpattern';
import { Datasource, DatasourceSuggestion } from '../types';
import { generateId } from '../id_generator';
import { Storage } from 'ui/storage';
import { coreMock } from 'src/core/public/mocks';

jest.mock('./loader');
jest.mock('../id_generator');
// chrome, notify, storage are used by ./plugin
jest.mock('ui/chrome');
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

describe('IndexPattern Data Source suggestions', () => {
  let persistedState: IndexPatternPersistedState;
  let indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState>;

  beforeEach(() => {
    indexPatternDatasource = getIndexPatternDatasource({
      core: coreMock.createStart(),
      chrome: chromeMock,
      storage: {} as Storage,
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

  describe('#getDatasourceSuggestionsForField', () => {
    describe('with no layer', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        jest.resetAllMocks();
        initialState = await indexPatternDatasource.initialize({
          currentIndexPatternId: '1',
          layers: {},
        });
        (generateId as jest.Mock).mockReturnValueOnce('suggestedLayer');
        (generateId as jest.Mock).mockReturnValueOnce('col1');
        (generateId as jest.Mock).mockReturnValueOnce('col2');
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'source', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });
        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                suggestedLayer: expect.objectContaining({
                  columnOrder: ['col1', 'col2'],
                  columns: {
                    col1: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    col2: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should make a metric suggestion for a number field if there is no time field', async () => {
        const state: IndexPatternPrivateState = {
          currentIndexPatternId: '1',
          showEmptyFields: false,
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                first: expect.objectContaining({
                  columnOrder: ['suggestedLayer'],
                  columns: {
                    suggestedLayer: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });
    });

    describe('with a previous empty layer', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        jest.resetAllMocks();
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
        (generateId as jest.Mock).mockReturnValueOnce('col1');
        (generateId as jest.Mock).mockReturnValueOnce('col2');
      });

      it('should apply a bucketed aggregation for a string field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'source', type: 'string', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should apply a bucketed aggregation for a date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should select a metric for a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['col1', 'col2'],
                  columns: {
                    col1: expect.objectContaining({
                      operationType: 'date_histogram',
                      sourceField: 'timestamp',
                    }),
                    col2: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
      });

      it('should make a metric suggestion for a number field if there is no time field', async () => {
        const state: IndexPatternPrivateState = {
          currentIndexPatternId: '1',
          showEmptyFields: false,
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: expect.objectContaining({
                  columnOrder: ['col1'],
                  columns: {
                    col1: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
          })
        );
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
                  label: 'Avg of bytes',
                  operationType: 'avg',
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
                    label: 'Avg of bytes',
                    operationType: 'avg',
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
          })
        );
      });

      it('puts a date histogram column after the last bucket column on date field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'timestamp', type: 'date', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'extended',
              label: undefined,
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
            },
          })
        );
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
          })
        );
      });

      it('appends a metric column on a number field', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'memory', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['col1', 'col2', 'newId'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    newId: expect.objectContaining({
                      operationType: 'avg',
                      sourceField: 'memory',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });

      it('appends a metric column with a different operation on a number field if field is already in use', () => {
        const suggestions = indexPatternDatasource.getDatasourceSuggestionsForField(initialState, {
          field: { name: 'bytes', type: 'number', aggregatable: true, searchable: true },
          indexPatternId: '1',
        });

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
              layers: {
                previousLayer: initialState.layers.previousLayer,
                currentLayer: expect.objectContaining({
                  columnOrder: ['col1', 'col2', 'newId'],
                  columns: {
                    ...initialState.layers.currentLayer.columns,
                    newId: expect.objectContaining({
                      operationType: 'sum',
                      sourceField: 'bytes',
                    }),
                  },
                }),
              },
            }),
          })
        );
      });
    });

    describe('finding the layer that is using the current index pattern', () => {
      let initialState: IndexPatternPrivateState;

      beforeEach(async () => {
        jest.resetAllMocks();
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
        (generateId as jest.Mock).mockReturnValueOnce('col1');
        (generateId as jest.Mock).mockReturnValueOnce('col2');
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
            table: {
              changeType: 'initial',
              label: undefined,
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
            },
          })
        );
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

        expect(suggestions).toContainEqual(
          expect.objectContaining({
            state: expect.objectContaining({
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
            }),
          })
        );
      });
    });
  });

  describe('#getDatasourceSuggestionsFromCurrentState', () => {
    it('returns no suggestions if there are no columns', () => {
      expect(
        indexPatternDatasource.getDatasourceSuggestionsFromCurrentState({
          showEmptyFields: false,
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

    it('returns a single suggestion containing the current columns for each layer', async () => {
      const state = await indexPatternDatasource.initialize({
        ...persistedState,
        layers: {
          ...persistedState.layers,
          second: {
            ...persistedState.layers.first,
            columns: {
              col1: {
                label: 'My Op 2',
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
      });
      expect(indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state)).toEqual([
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'unchanged',
            label: undefined,
            columns: [
              {
                columnId: 'col1',
                operation: {
                  label: 'My Op',
                  dataType: 'string',
                  isBucketed: true,
                  scale: undefined,
                },
              },
            ],
            layerId: 'first',
          },
        }),
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'unchanged',
            label: undefined,
            columns: [
              {
                columnId: 'col1',
                operation: {
                  label: 'My Op 2',
                  dataType: 'string',
                  isBucketed: true,
                  scale: undefined,
                },
              },
            ],
            layerId: 'second',
          },
        }),
      ]);
    });

    it('returns a metric over time for single metric tables', async () => {
      jest.resetAllMocks();
      (generateId as jest.Mock).mockReturnValueOnce('col2');
      const state = await indexPatternDatasource.initialize({
        ...persistedState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'My Op',
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      });
      expect(indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state)[0]).toEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'extended',
            label: 'Over time',
            columns: [
              {
                columnId: 'col2',
                operation: {
                  label: 'Date Histogram of timestamp',
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'col1',
                operation: {
                  label: 'My Op',
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                },
              },
            ],
            layerId: 'first',
          },
        })
      );
    });

    it('adds date histogram over default time field for tables without time dimension', async () => {
      jest.resetAllMocks();
      (generateId as jest.Mock).mockReturnValueOnce('newCol');
      const state = await indexPatternDatasource.initialize({
        ...persistedState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                label: 'My Terms',
                dataType: 'string',
                isBucketed: true,
                operationType: 'terms',
                sourceField: 'source',
                scale: 'ordinal',
                params: {
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                  size: 5,
                },
              },
              col2: {
                label: 'My Op',
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      });
      expect(indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state)[2]).toEqual(
        expect.objectContaining({
          table: {
            isMultiRow: true,
            changeType: 'extended',
            label: 'Over time',
            columns: [
              {
                columnId: 'col1',
                operation: {
                  label: 'My Terms',
                  dataType: 'string',
                  isBucketed: true,
                  scale: 'ordinal',
                },
              },
              {
                columnId: 'newCol',
                operation: {
                  label: 'Date Histogram of timestamp',
                  dataType: 'date',
                  isBucketed: true,
                  scale: 'interval',
                },
              },
              {
                columnId: 'col2',
                operation: {
                  label: 'My Op',
                  dataType: 'number',
                  isBucketed: false,
                  scale: 'ratio',
                },
              },
            ],
            layerId: 'first',
          },
        })
      );
    });

    it('does not create an over time suggestion if there is no default time field', async () => {
      jest.resetAllMocks();
      (generateId as jest.Mock).mockReturnValueOnce('newCol');
      const state = await indexPatternDatasource.initialize({
        ...persistedState,
        layers: {
          first: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: {
                label: 'My Op',
                dataType: 'number',
                isBucketed: false,
                operationType: 'avg',
                sourceField: 'bytes',
                scale: 'ratio',
              },
            },
          },
        },
      });
      const suggestions = indexPatternDatasource.getDatasourceSuggestionsFromCurrentState({
        ...state,
        indexPatterns: { 1: { ...state.indexPatterns['1'], timeFieldName: undefined } },
      });
      suggestions.forEach(suggestion => expect(suggestion.table.columns.length).toBe(1));
    });

    it('returns simplified versions of table with more than 2 columns', () => {
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            fields: [
              {
                name: 'field1',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field3',
                type: 'string',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field4',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field5',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          },
        },
        showEmptyFields: true,
        layers: {
          first: {
            ...persistedState.layers.first,
            columns: {
              col1: {
                label: 'My Op',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field1',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col2: {
                label: 'My Op',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field2',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col3: {
                label: 'My Op',
                dataType: 'string',
                isBucketed: true,

                operationType: 'terms',
                sourceField: 'field3',
                params: {
                  size: 5,
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                },
              },
              col4: {
                label: 'My Op',
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field4',
              },
              col5: {
                label: 'My Op',
                dataType: 'number',
                isBucketed: false,

                operationType: 'min',
                sourceField: 'field5',
              },
            },
            columnOrder: ['col1', 'col2', 'col3', 'col4', 'col5'],
          },
        },
      };

      const suggestions = indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state);
      // 1 bucket col, 2 metric cols
      isTableWithBucketColumns(suggestions[0], ['col1', 'col4', 'col5'], 1);

      // 1 bucket col, 1 metric col
      isTableWithBucketColumns(suggestions[1], ['col1', 'col4'], 1);

      // 2 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[2], ['col1', 'col2', 'col4', 'col5'], 2);

      // 2 bucket cols, 1 metric col
      isTableWithBucketColumns(suggestions[3], ['col1', 'col2', 'col4'], 2);

      // 3 bucket cols, 2 metric cols
      isTableWithBucketColumns(suggestions[4], ['col1', 'col2', 'col3', 'col4', 'col5'], 3);

      // 3 bucket cols, 1 metric col
      isTableWithBucketColumns(suggestions[5], ['col1', 'col2', 'col3', 'col4'], 3);

      // first metric col
      isTableWithMetricColumns(suggestions[6], ['col4']);

      // second metric col
      isTableWithMetricColumns(suggestions[7], ['col5']);

      expect(suggestions.length).toBe(8);
    });

    it('returns an only metric version of a given table', () => {
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            fields: [
              {
                name: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
              {
                name: 'field2',
                type: 'date',
                aggregatable: true,
                searchable: true,
              },
            ],
          },
        },
        showEmptyFields: true,
        layers: {
          first: {
            ...persistedState.layers.first,
            columns: {
              col1: {
                label: 'Date histogram',
                dataType: 'date',
                isBucketed: true,

                operationType: 'date_histogram',
                sourceField: 'field2',
                params: {
                  interval: 'd',
                },
              },
              col2: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field1',
              },
            },
            columnOrder: ['col1', 'col2'],
          },
        },
      };

      const suggestions = indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state);
      expect(suggestions[1].table.columns[0].operation.label).toBe('Average of field1');
    });

    it('returns an alternative metric for an only-metric table', () => {
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: '1',
        indexPatterns: {
          1: {
            id: '1',
            title: 'my-fake-index-pattern',
            fields: [
              {
                name: 'field1',
                type: 'number',
                aggregatable: true,
                searchable: true,
              },
            ],
          },
        },
        showEmptyFields: true,
        layers: {
          first: {
            ...persistedState.layers.first,
            columns: {
              col1: {
                label: 'Average of field1',
                dataType: 'number',
                isBucketed: false,

                operationType: 'avg',
                sourceField: 'field1',
              },
            },
            columnOrder: ['col1'],
          },
        },
      };

      const suggestions = indexPatternDatasource.getDatasourceSuggestionsFromCurrentState(state);
      expect(suggestions[0].table.columns.length).toBe(1);
      expect(suggestions[0].table.columns[0].operation.label).toBe('Sum of field1');
    });
  });
});

function isTableWithBucketColumns(
  suggestion: DatasourceSuggestion<IndexPatternPrivateState>,
  columnIds: string[],
  numBuckets: number
) {
  expect(suggestion.table.columns.map(column => column.columnId)).toEqual(columnIds);
  expect(
    suggestion.table.columns.slice(0, numBuckets).every(column => column.operation.isBucketed)
  ).toBeTruthy();
}

function isTableWithMetricColumns(
  suggestion: DatasourceSuggestion<IndexPatternPrivateState>,
  columnIds: string[]
) {
  expect(suggestion.table.isMultiRow).toEqual(false);
  expect(suggestion.table.columns.map(column => column.columnId)).toEqual(columnIds);
  expect(suggestion.table.columns.every(column => !column.operation.isBucketed)).toBeTruthy();
}
