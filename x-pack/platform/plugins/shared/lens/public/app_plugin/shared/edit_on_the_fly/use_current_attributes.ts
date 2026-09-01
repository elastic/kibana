/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import type { TypedLensSerializedState } from '@kbn/lens-common';
import { createEmptyLensState } from '../../../react_embeddable/helper';
import { useLensSelector } from '../../../state_management';
import { extractReferencesFromState } from '../../../utils';
import { useEditorFrameService } from '../../../editor_frame_service/editor_frame_service_context';

export const useCurrentAttributes = ({
  initialAttributes,
}: {
  initialAttributes?: TypedLensSerializedState['attributes'];
}) => {
  const { visualizationMap, datasourceMap } = useEditorFrameService();

  const { datasourceStates, visualization, activeDatasourceId } = useLensSelector(
    (state) => state.lens
  );

  // use the latest activeId, but fallback to attributes
  const visualizationType = visualization.activeId ?? initialAttributes?.visualizationType;
  const activeVisualization = visualizationType ? visualizationMap[visualizationType] : undefined;

  const currentAttributes = useMemo(() => {
    if (!activeVisualization) {
      return initialAttributes;
    }
    const dsStates = Object.fromEntries(
      Object.entries(datasourceStates).map(([id, ds]) => {
        const dsState = ds.state;
        return [id, dsState];
      })
    );
    // ES|QL layers use adHoc dataviews whose ids are not saved objects, so their
    // references must not be persisted. References from other datasources must be
    // kept though: e.g. form-based reference line or query annotation layers next
    // to ES|QL data layers resolve their data view exclusively via references.
    const adHocDataViewIds = new Set(Object.keys(initialAttributes?.state.adHocDataViews ?? {}));
    const references = visualization.state
      ? extractReferencesFromState({
          activeDatasourceId,
          activeDatasources: Object.keys(datasourceStates).reduce(
            (acc, id) => ({
              ...acc,
              [id]: datasourceMap[id],
            }),
            {}
          ),
          datasourceStates,
          visualizationState: visualization.state,
          activeVisualization,
        }).filter((ref) => !(ref.type === 'index-pattern' && adHocDataViewIds.has(ref.id)))
      : [];
    const attributes = initialAttributes ?? createEmptyLensState().attributes;
    const attrs: TypedLensSerializedState['attributes'] = {
      ...attributes,
      state: {
        ...attributes.state,
        visualization: visualization.state,
        datasourceStates: dsStates,
      },
      references,
      visualizationType: activeVisualization.id,
    };
    return attrs;
  }, [
    activeDatasourceId,
    activeVisualization,
    datasourceMap,
    datasourceStates,
    initialAttributes,
    visualization.state,
  ]);

  return currentAttributes;
};
