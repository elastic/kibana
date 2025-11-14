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
  textBasedMode,
  initialAttributes,
}: {
  initialAttributes?: TypedLensSerializedState['attributes'];
  textBasedMode?: boolean;
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
    // as ES|QL queries are using adHoc dataviews, we don't want to pass references
    const references =
      !textBasedMode && visualization.state
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
          })
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
    textBasedMode,
    visualization.state,
  ]);

  return currentAttributes;
};
