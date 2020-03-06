/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/public';
import _ from 'lodash';
import {
  loadInitialState,
  loadIndexPatterns,
  changeIndexPattern,
  changeLayerIndexPattern,
  syncExistingFields,
} from './loader';
import { IndexPatternPersistedState, IndexPatternPrivateState } from './types';
import { documentField } from './document_field';

// TODO: This should not be necessary
jest.mock('ui/new_platform');
jest.mock('./operations');

const sampleIndexPatterns = {
  a: {
    id: 'a',
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
        esTypes: ['keyword'],
      },
      {
        name: 'dest',
        type: 'string',
        aggregatable: true,
        searchable: true,
        esTypes: ['keyword'],
      },
      documentField,
    ],
  },
  b: {
    id: 'b',
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
        aggregatable: false,
        searchable: false,
        scripted: true,
        aggregationRestrictions: {
          terms: {
            agg: 'terms',
          },
        },
        esTypes: ['keyword'],
      },
      documentField,
    ],
  },
};

function indexPatternSavedObject({ id }: { id: keyof typeof sampleIndexPatterns }) {
  const pattern = {
    ...sampleIndexPatterns[id],
    fields: [
      ...sampleIndexPatterns[id].fields,
      {
        name: 'description',
        type: 'string',
        aggregatable: false,
        searchable: true,
        esTypes: ['text'],
      },
    ],
  };
  return {
    id,
    type: 'index-pattern',
    attributes: {
      title: pattern.title,
      timeFieldName: pattern.timeFieldName,
      fields: JSON.stringify(pattern.fields.filter(f => f.type !== 'document')),
    },
  };
}

function mockClient() {
  return ({
    find: jest.fn(async () => ({
      savedObjects: [
        { id: 'a', attributes: { title: sampleIndexPatterns.a.title } },
        { id: 'b', attributes: { title: sampleIndexPatterns.b.title } },
      ],
    })),
    async bulkGet(indexPatterns: Array<{ id: keyof typeof sampleIndexPatterns }>) {
      return {
        savedObjects: indexPatterns.map(({ id }) => indexPatternSavedObject({ id })),
      };
    },
  } as unknown) as Pick<SavedObjectsClientContract, 'find' | 'bulkGet'>;
}

describe('loader', () => {
  describe('loadIndexPatterns', () => {
    it('should not load index patterns that are already loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: sampleIndexPatterns,
        patterns: ['a', 'b'],
        savedObjectsClient: {
          bulkGet: jest.fn(() => Promise.reject('bulkGet should not have been called')),
          find: jest.fn(() => Promise.reject('find should not have been called')),
        },
      });

      expect(cache).toEqual(sampleIndexPatterns);
    });

    it('should load index patterns that are not loaded', async () => {
      const cache = await loadIndexPatterns({
        cache: {
          b: sampleIndexPatterns.b,
        },
        patterns: ['a', 'b'],
        savedObjectsClient: mockClient(),
      });

      expect(cache).toMatchObject(sampleIndexPatterns);
    });

    it('should allow scripted, but not full text fields', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['a', 'b'],
        savedObjectsClient: mockClient(),
      });

      expect(cache).toMatchObject(sampleIndexPatterns);
    });

    it('should apply field restrictions from typeMeta', async () => {
      const cache = await loadIndexPatterns({
        cache: {},
        patterns: ['foo'],
        savedObjectsClient: ({
          ...mockClient(),
          async bulkGet() {
            return {
              savedObjects: [
                {
                  id: 'foo',
                  type: 'index-pattern',
                  attributes: {
                    title: 'Foo index',
                    typeMeta: JSON.stringify({
                      aggs: {
                        date_histogram: {
                          timestamp: {
                            agg: 'date_histogram',
                            fixed_interval: 'm',
                          },
                        },
                        sum: {
                          bytes: {
                            agg: 'sum',
                          },
                        },
                      },
                    }),
                    fields: JSON.stringify([
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
                    ]),
                  },
                },
              ],
            };
          },
        } as unknown) as Pick<SavedObjectsClientContract, 'find' | 'bulkGet'>,
      });

      expect(cache.foo.fields.find(f => f.name === 'bytes')!.aggregationRestrictions).toEqual({
        sum: { agg: 'sum' },
      });
      expect(cache.foo.fields.find(f => f.name === 'timestamp')!.aggregationRestrictions).toEqual({
        date_histogram: { agg: 'date_histogram', fixed_interval: 'm' },
      });
    });
  });

  describe('loadInitialState', () => {
    it('should load a default state', async () => {
      const state = await loadInitialState({
        savedObjectsClient: mockClient(),
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'a',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {},
        showEmptyFields: false,
      });
    });

    it('should use the default index pattern id, if provided', async () => {
      const state = await loadInitialState({
        defaultIndexPatternId: 'b',
        savedObjectsClient: mockClient(),
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          b: sampleIndexPatterns.b,
        },
        layers: {},
        showEmptyFields: false,
      });
    });

    it('should initialize from saved state', async () => {
      const savedState: IndexPatternPersistedState = {
        currentIndexPatternId: 'b',
        layers: {
          layerb: {
            indexPatternId: 'b',
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
              },
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
      const state = await loadInitialState({
        state: savedState,
        savedObjectsClient: mockClient(),
      });

      expect(state).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatternRefs: [
          { id: 'a', title: sampleIndexPatterns.a.title },
          { id: 'b', title: sampleIndexPatterns.b.title },
        ],
        indexPatterns: {
          b: sampleIndexPatterns.b,
        },
        layers: savedState.layers,
        showEmptyFields: false,
      });
    });
  });

  describe('changeIndexPattern', () => {
    it('loads the index pattern and then sets it as current', async () => {
      const setState = jest.fn();
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        indexPatterns: {},
        existingFields: {},
        layers: {},
        showEmptyFields: true,
      };

      await changeIndexPattern({
        state,
        setState,
        id: 'a',
        savedObjectsClient: mockClient(),
        onError: jest.fn(),
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: 'a',
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {},
        layers: {},
        showEmptyFields: true,
      };

      await changeIndexPattern({
        state,
        setState,
        id: 'a',
        savedObjectsClient: {
          ...mockClient(),
          bulkGet: jest.fn(async () => {
            throw err;
          }),
        },
        onError,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe('changeLayerIndexPattern', () => {
    it('loads the index pattern and then changes the specified layer', async () => {
      const setState = jest.fn();
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
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
            indexPatternId: 'a',
          },
        },
        showEmptyFields: true,
      };

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: 'b',
        layerId: 'l1',
        savedObjectsClient: mockClient(),
        onError: jest.fn(),
      });

      expect(setState).toHaveBeenCalledTimes(1);
      expect(setState.mock.calls[0][0](state)).toMatchObject({
        currentIndexPatternId: 'b',
        indexPatterns: {
          a: sampleIndexPatterns.a,
          b: sampleIndexPatterns.b,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
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
                  interval: '1d',
                },
                sourceField: 'timestamp',
              },
            },
            indexPatternId: 'b',
          },
        },
      });
    });

    it('handles errors', async () => {
      const setState = jest.fn();
      const onError = jest.fn();
      const err = new Error('NOPE!');
      const state: IndexPatternPrivateState = {
        currentIndexPatternId: 'b',
        indexPatternRefs: [],
        existingFields: {},
        indexPatterns: {
          a: sampleIndexPatterns.a,
        },
        layers: {
          l0: {
            columnOrder: ['col1'],
            columns: {},
            indexPatternId: 'a',
          },
        },
        showEmptyFields: true,
      };

      await changeLayerIndexPattern({
        state,
        setState,
        indexPatternId: 'b',
        layerId: 'l0',
        savedObjectsClient: {
          ...mockClient(),
          bulkGet: jest.fn(async () => {
            throw err;
          }),
        },
        onError,
      });

      expect(setState).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(err);
    });
  });

  describe('syncExistingFields', () => {
    it('should call once for each index pattern', async () => {
      const setState = jest.fn();
      const fetchJson = jest.fn(({ path }: { path: string }) => {
        const indexPatternTitle = _.last(path.split('/'));
        return {
          indexPatternTitle,
          existingFieldNames: ['field_1', 'field_2'].map(
            fieldName => `${indexPatternTitle}_${fieldName}`
          ),
        };
      });

      await syncExistingFields({
        dateRange: { fromDate: '1900-01-01', toDate: '2000-01-01' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fetchJson: fetchJson as any,
        indexPatterns: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
        setState,
      });

      expect(fetchJson).toHaveBeenCalledTimes(3);
      expect(setState).toHaveBeenCalledTimes(1);

      const [fn] = setState.mock.calls[0];
      const newState = fn({
        foo: 'bar',
        existingFields: {},
      });

      expect(newState).toEqual({
        foo: 'bar',
        existingFields: {
          a: { a_field_1: true, a_field_2: true },
          b: { b_field_1: true, b_field_2: true },
          c: { c_field_1: true, c_field_2: true },
        },
      });
    });
  });
});
