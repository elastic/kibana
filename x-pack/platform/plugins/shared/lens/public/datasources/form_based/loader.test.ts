/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loadInitialState,
  changeIndexPattern,
  changeLayerIndexPattern,
  extractReferences,
  injectReferences,
} from './loader';
import { FormBasedPersistedState, FormBasedPrivateState } from './types';
import { DateHistogramIndexPatternColumn, TermsIndexPatternColumn } from './operations';
import { sampleIndexPatterns } from '../../data_views_service/mocks';

const createMockStorage = (lastData?: Record<string, string>) => {
  return {
    get: jest.fn().mockImplementation(() => lastData),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  };
};

const indexPatternRefs = [
  {
    id: sampleIndexPatterns[1].id,
    title: sampleIndexPatterns[1].title,
  },
  {
    id: sampleIndexPatterns[2].id,
    title: sampleIndexPatterns[2].title,
  },
];

describe('loader', () => {
  describe('loadInitialState', () => {
    it('should load a default state', () => {
      const storage = createMockStorage();
      const state = loadInitialState({
        indexPatterns: sampleIndexPatterns,
        indexPatternRefs,
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '1',
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('should load a default state without loading the indexPatterns when embedded', () => {
      const storage = createMockStorage();
      const state = loadInitialState({
        storage,
        indexPatterns: {},
        indexPatternRefs: [],
      });

      expect(state).toMatchObject({
        currentIndexPatternId: undefined,
        layers: {},
      });

      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should load a default state when lastUsedIndexPatternId is not found in indexPatternRefs', () => {
      const storage = createMockStorage({ indexPatternId: 'c' });
      const state = loadInitialState({
        storage,
        indexPatternRefs,
        indexPatterns: sampleIndexPatterns,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '1',
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('should load lastUsedIndexPatternId if in localStorage', () => {
      const state = loadInitialState({
        storage: createMockStorage({ indexPatternId: '2' }),
        indexPatternRefs,
        indexPatterns: sampleIndexPatterns,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        layers: {},
      });
    });

    it('should use the default index pattern id, if provided', () => {
      const storage = createMockStorage();
      const state = loadInitialState({
        defaultIndexPatternId: '2',
        storage,
        indexPatternRefs,
        indexPatterns: sampleIndexPatterns,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });

    it('should use the indexPatternId of the visualize trigger field, if provided', () => {
      const storage = createMockStorage();
      const state = loadInitialState({
        storage,
        initialContext: {
          dataViewSpec: { id: '1' },
          fieldName: '',
        },
        indexPatternRefs,
        indexPatterns: sampleIndexPatterns,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '1',
        layers: {},
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('should initialize all the embeddable references without local storage', () => {
      const savedState: FormBasedPersistedState = {
        layers: {
          layerb: {
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'date',
                isBucketed: true,
                label: 'My date',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              } as DateHistogramIndexPatternColumn,
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Sum of bytes',
                operationType: 'sum',
                sourceField: 'bytes',
              },
            },
          },
        },
      };
      const storage = createMockStorage({});
      const state = loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
          { name: 'another-reference', id: 'c', type: 'index-pattern' },
        ],
        indexPatternRefs: [],
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: undefined,
        layers: { layerb: { ...savedState.layers.layerb, indexPatternId: '2' } },
      });
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should initialize from saved state', () => {
      const savedState: FormBasedPersistedState = {
        layers: {
          layerb: {
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'date',
                isBucketed: true,
                label: 'My date',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              } as DateHistogramIndexPatternColumn,
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Sum of bytes',
                operationType: 'sum',
                sourceField: 'bytes',
              },
            },
          },
        },
      };
      const storage = createMockStorage({ indexPatternId: '1' });
      const state = loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
          { name: 'another-reference', id: 'c', type: 'index-pattern' },
        ],

        indexPatternRefs,
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        storage,
      });

      expect(state).toMatchObject({
        currentIndexPatternId: '2',
        layers: { layerb: { ...savedState.layers.layerb, indexPatternId: '2' } },
      });

      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });
  });

  describe('saved object references', () => {
    const state: FormBasedPrivateState = {
      currentIndexPatternId: 'b',
      layers: {
        a: {
          indexPatternId: 'id-index-pattern-a',
          columnOrder: ['col1'],
          columns: {
            col1: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'average',
              sourceField: 'myfield',
            },
          },
        },
        b: {
          indexPatternId: 'id-index-pattern-b',
          columnOrder: ['col2'],
          columns: {
            col2: {
              dataType: 'number',
              isBucketed: false,
              label: '',
              operationType: 'average',
              sourceField: 'myfield2',
            },
          },
        },
      },
    };

    it('should create a reference for each layer and for current index pattern', () => {
      const { savedObjectReferences } = extractReferences(state);
      expect(savedObjectReferences).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "id-index-pattern-a",
            "name": "indexpattern-datasource-layer-a",
            "type": "index-pattern",
          },
          Object {
            "id": "id-index-pattern-b",
            "name": "indexpattern-datasource-layer-b",
            "type": "index-pattern",
          },
        ]
      `);
    });

    it('should restore layers', () => {
      const { savedObjectReferences, state: persistedState } = extractReferences(state);
      expect(injectReferences(persistedState, savedObjectReferences).layers).toEqual(state.layers);
    });
  });

  describe('changeIndexPattern', () => {
    it('sets the given indexpattern as current', () => {
      const state: FormBasedPrivateState = {
        currentIndexPatternId: '2',
        layers: {},
      };
      const storage = createMockStorage({ indexPatternId: '2' });

      const newState = changeIndexPattern({
        indexPatternId: '1',
        state,
        storage,
        indexPatterns: {
          '1': sampleIndexPatterns['1'],
        },
      });

      expect(newState).toMatchObject({
        currentIndexPatternId: '1',
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '1',
      });
    });

    it('should update an empty layer on indexpattern change', () => {
      const state: FormBasedPrivateState = {
        currentIndexPatternId: '2',
        layers: { layerId: { columnOrder: [], columns: {}, indexPatternId: '2' } },
      };
      const storage = createMockStorage({ indexPatternId: '2' });

      const newState = changeIndexPattern({
        indexPatternId: '1',
        state,
        storage,
        indexPatterns: sampleIndexPatterns,
      });

      expect(newState.layers.layerId).toEqual({
        columnOrder: [],
        columns: {},
        indexPatternId: '1',
      });
    });

    it('should keep layer indexpattern on change if not empty', () => {
      const state: FormBasedPrivateState = {
        currentIndexPatternId: '2',
        layers: {
          layerId: {
            columnOrder: ['col1'],
            columns: {
              col1: {
                dataType: 'string',
                isBucketed: true,
                label: '',
                operationType: 'terms',
                sourceField: 'bytes',
                params: {
                  orderBy: { type: 'alphabetical' },
                  orderDirection: 'asc',
                  size: 3,
                },
              } as TermsIndexPatternColumn,
            },
            indexPatternId: '2',
          },
        },
      };
      const storage = createMockStorage({ indexPatternId: '2' });

      const newState = changeIndexPattern({
        indexPatternId: '1',
        state,
        storage,
        indexPatterns: sampleIndexPatterns,
      });

      expect(newState.layers).toEqual({
        layerId: {
          columnOrder: ['col1'],
          columns: {
            col1: {
              dataType: 'string',
              isBucketed: true,
              label: '',
              operationType: 'terms',
              sourceField: 'bytes',
              params: {
                orderBy: { type: 'alphabetical' },
                orderDirection: 'asc',
                size: 3,
              },
            },
          },
          indexPatternId: '2',
        },
      });
    });
  });

  describe('changeLayerIndexPattern', () => {
    it('loads the index pattern and then changes the specified layers', async () => {
      const state: FormBasedPrivateState = {
        currentIndexPatternId: '1',
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: '1',
          },
          l1: {
            columnOrder: ['col2'],
            columns: {
              col2: {
                dataType: 'date',
                isBucketed: true,
                label: 'My hist',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              } as DateHistogramIndexPatternColumn,
            },
            indexPatternId: '1',
          },
        },
      };

      const storage = createMockStorage({ indexPatternId: '1' });

      const newState = changeLayerIndexPattern({
        state,
        indexPatternId: '2',
        layerIds: ['l0', 'l1'],
        storage,
        indexPatterns: sampleIndexPatterns,
        replaceIfPossible: true,
      });

      expect(newState).toMatchObject({
        currentIndexPatternId: '2',
        layers: {
          l0: {
            columnOrder: [],
            columns: {},
            indexPatternId: '2',
          },
          l1: {
            columnOrder: ['col2'],
            columns: {
              col2: {
                dataType: 'date',
                isBucketed: true,
                label: 'My hist',
                operationType: 'date_histogram',
                params: {
                  interval: 'm',
                },
                sourceField: 'timestamp',
              },
            },
            indexPatternId: '2',
          },
        },
      });
      expect(storage.set).toHaveBeenCalledWith('lens-settings', {
        indexPatternId: '2',
      });
    });
  });
});
