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
import type { FormBasedPersistedState, FormBasedPrivateState } from './types';
import type {
  DateHistogramIndexPatternColumn,
  FormulaIndexPatternColumn,
  TermsIndexPatternColumn,
} from './operations';
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

    it('should expand formula columns correctly', () => {
      const savedState: FormBasedPersistedState = {
        layers: {
          layerb: {
            columnOrder: ['col1', 'col2'],
            columns: {
              col1: {
                dataType: 'number',
                isBucketed: false,
                label: 'Formula 1',
                operationType: 'formula',
                params: {
                  formula: 'sum(bytes) + 100',
                },
                references: [],
              } as FormulaIndexPatternColumn,
              col2: {
                dataType: 'number',
                isBucketed: false,
                label: 'Formula 2',
                operationType: 'formula',
                params: {
                  formula: 'average(bytes) + 100',
                },
                references: [],
              } as FormulaIndexPatternColumn,
            },
          },
        },
      };
      const storage = createMockStorage({ indexPatternId: '1' });
      const state = loadInitialState({
        persistedState: savedState,
        references: [
          { name: 'indexpattern-datasource-layer-layerb', id: '2', type: 'index-pattern' },
        ],

        indexPatternRefs,
        indexPatterns: {
          '2': sampleIndexPatterns['2'],
        },
        storage,
      });

      // First shallow check: formula columns should be expanded
      expect(state.layers.layerb.columnOrder).toHaveLength(
        Object.keys(savedState.layers.layerb.columns).length * 3
      );

      // Deep check: the formulas should be correctly expanded
      expect(state.layers.layerb).toMatchInlineSnapshot(`
        Object {
          "columnOrder": Array [
            "col1",
            "col2",
            "col1X0",
            "col1X1",
            "col2X0",
            "col2X1",
          ],
          "columns": Object {
            "col1": Object {
              "dataType": "number",
              "isBucketed": false,
              "label": "sum(bytes) + 100",
              "operationType": "formula",
              "params": Object {
                "formula": "sum(bytes) + 100",
                "isFormulaBroken": false,
              },
              "references": Array [
                "col1X1",
              ],
            },
            "col1X0": Object {
              "customLabel": true,
              "dataType": "number",
              "filter": undefined,
              "isBucketed": false,
              "label": "Part of sum(bytes) + 100",
              "operationType": "sum",
              "params": Object {
                "emptyAsNull": false,
              },
              "reducedTimeRange": undefined,
              "sourceField": "bytes",
              "timeScale": undefined,
              "timeShift": undefined,
            },
            "col1X1": Object {
              "customLabel": true,
              "dataType": "number",
              "isBucketed": false,
              "label": "Part of sum(bytes) + 100",
              "operationType": "math",
              "params": Object {
                "tinymathAst": Object {
                  "args": Array [
                    "col1X0",
                    100,
                  ],
                  "location": Object {
                    "max": 16,
                    "min": 0,
                  },
                  "name": "add",
                  "text": "sum(bytes) + 100",
                  "type": "function",
                },
              },
              "references": Array [
                "col1X0",
              ],
            },
            "col2": Object {
              "dataType": "number",
              "isBucketed": false,
              "label": "average(bytes) + 100",
              "operationType": "formula",
              "params": Object {
                "formula": "average(bytes) + 100",
                "isFormulaBroken": false,
              },
              "references": Array [
                "col2X1",
              ],
            },
            "col2X0": Object {
              "customLabel": true,
              "dataType": "number",
              "filter": undefined,
              "isBucketed": false,
              "label": "Part of average(bytes) + 100",
              "operationType": "average",
              "params": Object {
                "emptyAsNull": false,
              },
              "reducedTimeRange": undefined,
              "sourceField": "bytes",
              "timeScale": undefined,
              "timeShift": undefined,
            },
            "col2X1": Object {
              "customLabel": true,
              "dataType": "number",
              "isBucketed": false,
              "label": "Part of average(bytes) + 100",
              "operationType": "math",
              "params": Object {
                "tinymathAst": Object {
                  "args": Array [
                    "col2X0",
                    100,
                  ],
                  "location": Object {
                    "max": 20,
                    "min": 0,
                  },
                  "name": "add",
                  "text": "average(bytes) + 100",
                  "type": "function",
                },
              },
              "references": Array [
                "col2X0",
              ],
            },
          },
          "indexPatternId": "2",
        }
      `);
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
      const { references } = extractReferences(state);
      expect(references).toMatchInlineSnapshot(`
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
      const { references, state: persistedState } = extractReferences(state);
      expect(injectReferences(persistedState, references).layers).toEqual(state.layers);
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
