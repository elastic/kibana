/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterManager } from '@kbn/data-plugin/public';
import type {
  DatasourceStates,
  VisualizationMap,
  DatasourceMap,
  TypedLensSerializedState,
} from '@kbn/lens-common';
import { mergeToNewDoc } from '../../state_management/shared_logic';

export function getStateManagementForInlineEditing(
  activeDatasourceId: 'formBased' | 'textBased',
  getAttributes: () => TypedLensSerializedState['attributes'],
  updateAttributes: (
    newAttributes: TypedLensSerializedState['attributes'],
    resetId?: boolean
  ) => void,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap,
  extractFilterReferences: FilterManager['extract']
) {
  const updatePanelState = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => {
    const viz = getAttributes();
    const datasourceStates: DatasourceStates = {
      [activeDatasourceId]: {
        isLoading: false,
        state: datasourceState,
      },
    };
    const newViz = mergeToNewDoc(
      viz,
      {
        activeId: visualizationType || viz.visualizationType,
        state: visualizationState,
        selectedLayerId: null,
      },
      datasourceStates,
      viz.state.query,
      viz.state.filters,
      activeDatasourceId,
      viz.state.adHocDataViews || {},
      { visualizationMap, datasourceMap, extractFilterReferences }
    );
    const newDoc: TypedLensSerializedState['attributes'] = {
      ...viz,
      ...newViz,
      visualizationType: newViz?.visualizationType ?? viz.visualizationType,
    };

    if (newDoc.state) {
      updateAttributes(newDoc, true);
    }
  };

  const updateSuggestion = updateAttributes;

  return { updateSuggestion, updatePanelState };
}
