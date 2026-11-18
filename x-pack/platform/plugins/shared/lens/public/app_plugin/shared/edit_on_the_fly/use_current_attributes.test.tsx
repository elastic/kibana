/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { TypedLensSerializedState } from '@kbn/lens-common';

import { mockVisualizationMap, mockDatasourceMap, renderWithReduxStore } from '../../../mocks';
import { EditorFrameServiceProvider } from '../../../editor_frame_service/editor_frame_service_context';
import { getActiveDatasourceIdFromDoc } from '../../../utils';
import { useCurrentAttributes } from './use_current_attributes';

function CurrentAttributesHarness({
  initialAttributes,
  onAttributes,
}: {
  initialAttributes: TypedLensSerializedState['attributes'];
  onAttributes: (attrs: TypedLensSerializedState['attributes'] | undefined) => void;
}) {
  const currentAttributes = useCurrentAttributes({ initialAttributes });
  onAttributes(currentAttributes);
  return null;
}

const formBasedAttributes = {
  title: 'Form-based chart',
  visualizationType: 'testVis',
  references: [],
  state: {
    query: { query: '', language: 'kuery' },
    filters: [],
    datasourceStates: {
      formBased: {
        layers: {
          layer1: { columnOrder: ['col1'], columns: { col1: {} }, indexPatternId: 'index1' },
        },
      },
    },
    visualization: { layerId: 'layer1' },
  },
} as unknown as TypedLensSerializedState['attributes'];

describe('useCurrentAttributes', () => {
  it('omits empty non-active datasource states so form-based panels are not misdetected as text-based', () => {
    const visualizationMap = mockVisualizationMap();
    const datasourceMap = mockDatasourceMap();

    let currentAttributes: TypedLensSerializedState['attributes'] | undefined;

    renderWithReduxStore(
      <EditorFrameServiceProvider visualizationMap={visualizationMap} datasourceMap={datasourceMap}>
        <CurrentAttributesHarness
          initialAttributes={formBasedAttributes}
          onAttributes={(attrs) => {
            currentAttributes = attrs;
          }}
        />
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          activeDatasourceId: 'formBased',
          visualization: {
            activeId: 'testVis',
            state: formBasedAttributes.state.visualization,
            selectedLayerId: null,
          },
          // Mirrors the inline editor store init: every datasource in the map is
          // initialized, so a pure form-based panel still carries an empty
          // textBased state in Redux.
          datasourceStates: {
            formBased: {
              isLoading: false,
              state: formBasedAttributes.state.datasourceStates.formBased,
            },
            textBased: {
              isLoading: false,
              state: { layers: {}, indexPatternRefs: [] },
            },
          },
        },
      }
    );

    expect(currentAttributes).toBeDefined();
    // the empty textBased datasource state must not leak into the serialized attributes
    expect(Object.keys(currentAttributes!.state.datasourceStates)).toEqual(['formBased']);
    // consumers deriving the active datasource from the attributes must resolve formBased
    expect(getActiveDatasourceIdFromDoc(currentAttributes)).toBe('formBased');
  });
});

describe('useCurrentAttributes ES|QL ad hoc data views', () => {
  const esqlReference = { type: 'index-pattern', id: 'esql-id', name: 'layer-reference' };
  const esqlSpec = { id: 'esql-id', title: 'logs-*', type: 'esql', timeFieldName: '@timestamp' };
  const textBasedState = {
    layers: {
      layer1: {
        index: 'esql-id',
        query: { esql: 'FROM logs-*' },
        columns: [],
        timeField: '@timestamp',
      },
    },
    indexPatternRefs: [],
  };

  const getAttributes = (adHocDataViews?: Record<string, unknown>) => {
    const attributes = {
      title: 'ES|QL chart',
      visualizationType: 'testVis',
      references: [],
      state: {
        filters: [],
        datasourceStates: { textBased: { layers: textBasedState.layers } },
        visualization: {},
        ...(adHocDataViews && { adHocDataViews }),
      },
    } as unknown as TypedLensSerializedState['attributes'];

    const datasourceMap = mockDatasourceMap();
    datasourceMap.textBased.getPersistableState.mockImplementation((state) => ({
      state,
      references: [esqlReference],
    }));

    let currentAttributes: TypedLensSerializedState['attributes'] | undefined;
    renderWithReduxStore(
      <EditorFrameServiceProvider
        visualizationMap={mockVisualizationMap()}
        datasourceMap={datasourceMap}
      >
        <CurrentAttributesHarness
          initialAttributes={attributes}
          onAttributes={(attrs) => {
            currentAttributes = attrs;
          }}
        />
      </EditorFrameServiceProvider>,
      {},
      {
        preloadedState: {
          activeDatasourceId: 'textBased',
          visualization: { activeId: 'testVis', state: {}, selectedLayerId: null },
          datasourceStates: { textBased: { isLoading: false, state: textBasedState } },
          dataViews: {
            indexPatterns: { 'esql-id': { ...esqlSpec, isPersisted: false, spec: esqlSpec } },
            indexPatternRefs: [],
          },
        },
      } as never
    );
    return currentAttributes!;
  };

  it.each([
    ['a persisted spec', { 'esql-id': esqlSpec }],
    ['no persisted spec', undefined],
  ])('does not persist the spec of an ES|QL layer, with %s', (_name, persisted) => {
    const { state, references } = getAttributes(persisted);

    expect(state.adHocDataViews).toEqual({});
    expect(state.internalReferences).toEqual([esqlReference]);
    expect(references).toEqual([]);
  });
});

describe('getActiveDatasourceIdFromDoc', () => {
  it('ignores empty datasource states baked into persisted panels', () => {
    const doc = {
      ...formBasedAttributes,
      state: {
        ...formBasedAttributes.state,
        datasourceStates: {
          ...formBasedAttributes.state.datasourceStates,
          // persisted panels can carry empty states for datasources that were
          // merely initialized in the editor
          textBased: { layers: {} },
          indexpattern: { layers: {} },
        },
      },
    } as unknown as TypedLensSerializedState['attributes'];

    expect(getActiveDatasourceIdFromDoc(doc)).toBe('formBased');
  });

  it('prefers textBased for mixed panels where it owns layers', () => {
    const doc = {
      ...formBasedAttributes,
      state: {
        ...formBasedAttributes.state,
        datasourceStates: {
          ...formBasedAttributes.state.datasourceStates,
          textBased: { layers: { esqlLayer: { query: { esql: 'FROM index1' } } } },
        },
      },
    } as unknown as TypedLensSerializedState['attributes'];

    expect(getActiveDatasourceIdFromDoc(doc)).toBe('textBased');
  });

  it('falls back to formBased when all datasource states are empty (new panel)', () => {
    const doc = {
      ...formBasedAttributes,
      state: {
        ...formBasedAttributes.state,
        datasourceStates: { formBased: { layers: {} }, textBased: { layers: {} } },
      },
    } as unknown as TypedLensSerializedState['attributes'];

    expect(getActiveDatasourceIdFromDoc(doc)).toBe('formBased');
  });
});
