/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, IndexPatternMap, TextBasedPersistedState } from '@kbn/lens-common';
import { LENS_DATASOURCE_ID } from '@kbn/lens-common';
import { createMockedIndexPattern } from '../form_based/mocks';
import { hydrateTextBasedLayerTimeFields, isTextBasedState } from './hydrate_time_field';

const indexPatterns: IndexPatternMap = {
  '1': createMockedIndexPattern({ id: '1', timeFieldName: 'timestamp' }),
};

const layerWithoutTimeField = {
  columns: [{ columnId: 'col1', fieldName: 'bytes', meta: { type: 'number' as const } }],
  query: { esql: 'FROM foo' },
  index: '1',
};

const textBasedDatasourceStates = (
  layers: TextBasedPersistedState['layers']
): DatasourceStates => ({
  [LENS_DATASOURCE_ID.TEXT_BASED]: {
    isLoading: false,
    state: { layers },
  },
});

const getLayers = (datasourceStates: DatasourceStates) =>
  (datasourceStates[LENS_DATASOURCE_ID.TEXT_BASED]?.state as TextBasedPersistedState).layers;

describe('isTextBasedState', () => {
  it('accepts empty layers and ES|QL layers with array columns', () => {
    expect(isTextBasedState({ layers: {} })).toBe(true);
    expect(isTextBasedState({ layers: { a: layerWithoutTimeField } })).toBe(true);
  });

  it('rejects form-based layers whose columns are a record, not an array', () => {
    expect(
      isTextBasedState({
        layers: {
          a: {
            indexPatternId: '1',
            columnOrder: ['col1'],
            columns: {
              col1: { operationType: 'count', label: 'Count' },
            },
          },
        },
      })
    ).toBe(false);
  });

  it('rejects missing layers, array-shaped layers, and columns without field names', () => {
    expect(isTextBasedState({ notLayers: true })).toBe(false);
    expect(isTextBasedState({ layers: [] })).toBe(false);
    expect(
      isTextBasedState({
        layers: {
          a: { columns: [{ columnId: 'col1' }], index: '1' },
        },
      })
    ).toBe(false);
  });
});

describe('hydrateTextBasedLayerTimeFields', () => {
  it('hydrates timeField from indexPatterns when a layer has no timeField', () => {
    const datasourceStates = textBasedDatasourceStates({ a: layerWithoutTimeField });
    const result = hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns);

    expect(getLayers(result).a.timeField).toBe('timestamp');
  });

  it('does not overwrite timeField when a layer already has one', () => {
    const datasourceStates = textBasedDatasourceStates({
      a: { ...layerWithoutTimeField, timeField: 'custom_time' },
    });
    const result = hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns);

    expect(getLayers(result).a.timeField).toBe('custom_time');
    expect(result).toBe(datasourceStates);
  });

  it('leaves a layer unchanged when layer.index does not match any indexPattern', () => {
    const datasourceStates = textBasedDatasourceStates({
      a: { ...layerWithoutTimeField, index: 'non-existent' },
    });
    const result = hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns);

    expect(getLayers(result).a.timeField).toBeUndefined();
    expect(result).toBe(datasourceStates);
  });

  it('hydrates each layer independently', () => {
    const patternsWithNoTime: IndexPatternMap = {
      ...indexPatterns,
      '2': createMockedIndexPattern({ id: '2', timeFieldName: undefined }),
    };
    const datasourceStates = textBasedDatasourceStates({
      a: layerWithoutTimeField,
      b: {
        columns: [{ columnId: 'col2', fieldName: 'src', meta: { type: 'string' as const } }],
        query: { esql: 'FROM bar' },
        index: '2',
      },
    });

    const result = hydrateTextBasedLayerTimeFields(datasourceStates, patternsWithNoTime);
    const layers = getLayers(result);

    expect(layers.a.timeField).toBe('timestamp');
    expect(layers.b.timeField).toBeUndefined();
  });

  it('returns the original datasource states when there is no text-based datasource', () => {
    const datasourceStates: DatasourceStates = {
      formBased: { isLoading: false, state: { layers: {} } },
    };

    expect(hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns)).toBe(datasourceStates);
  });

  it('returns the original datasource states when text-based state is not layer-shaped', () => {
    const datasourceStates: DatasourceStates = {
      [LENS_DATASOURCE_ID.TEXT_BASED]: {
        isLoading: false,
        state: { notLayers: true },
      },
    };

    expect(hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns)).toBe(datasourceStates);
  });

  it('returns the original datasource states when layers look form-based', () => {
    const datasourceStates: DatasourceStates = {
      [LENS_DATASOURCE_ID.TEXT_BASED]: {
        isLoading: false,
        state: {
          layers: {
            a: {
              columns: { col1: { operationType: 'count' } },
            },
          },
        },
      },
    };

    expect(hydrateTextBasedLayerTimeFields(datasourceStates, indexPatterns)).toBe(datasourceStates);
  });
});
