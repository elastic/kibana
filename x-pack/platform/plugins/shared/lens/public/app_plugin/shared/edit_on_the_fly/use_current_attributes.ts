/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { createEmptyLensState } from '../../../react_embeddable/helper';
import type { TypedLensSerializedState } from '../../../react_embeddable/types';
import { useLensSelector } from '../../../state_management';
import { extractReferencesFromState } from '../../../utils';
import type { DatasourceMap, VisualizationMap } from '../../../types';

export const useCurrentAttributes = ({
  textBasedMode,
  initialAttributes,
  datasourceMap,
  visualizationMap,
}: {
  initialAttributes?: TypedLensSerializedState['attributes'];
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  textBasedMode?: boolean;
}) => {
  const { datasourceStates, visualization } = useLensSelector((state) => state.lens);

  const [currentAttributes, setCurrentAttributes] = useState<
    TypedLensSerializedState['attributes'] | undefined
  >(initialAttributes);

  // use the latest activeId, but fallback to attributes
  const visualizationType = visualization.activeId ?? initialAttributes?.visualizationType;
  const activeVisualization = visualizationType ? visualizationMap[visualizationType] : undefined;

  useEffect(() => {
    if (!activeVisualization) {
      return;
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
    if (!isEqual(attrs, currentAttributes)) {
      setCurrentAttributes(attrs);
    }
  }, [
    activeVisualization,
    initialAttributes,
    datasourceMap,
    datasourceStates,
    currentAttributes,
    textBasedMode,
    visualization.activeId,
    visualization.state,
  ]);

  return currentAttributes;
};
