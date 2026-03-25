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
  /** Unused; kept so callers can pass through without breaking. References use extractReferencesFromState in form and text modes. */
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
    const activeDatasources = Object.keys(datasourceStates).reduce(
      (acc, id) => ({
        ...acc,
        [id]: datasourceMap[id],
      }),
      {}
    );
    const references =
      visualization.state && activeVisualization
        ? extractReferencesFromState({
            activeDatasourceId,
            activeDatasources,
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
  }, [activeDatasourceId, activeVisualization, datasourceMap, datasourceStates, initialAttributes, visualization.state]);

  return currentAttributes;
};
