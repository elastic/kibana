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
  LensDatasourceId,
} from '@kbn/lens-common';
import { mergeToNewDoc } from '../../state_management/shared_logic';
import { getActiveDatasourceIdFromDoc } from '../../utils';

export function getStateManagementForInlineEditing(
  initialDatasourceId: LensDatasourceId,
  getAttributes: () => TypedLensSerializedState['attributes'],
  updateAttributes: (
    newAttributes: TypedLensSerializedState['attributes'],
    resetId?: boolean
  ) => void,
  visualizationMap: VisualizationMap,
  datasourceMap: DatasourceMap,
  extractFilterReferences: FilterManager['extract']
) {
  const resolveActiveDatasourceId = (explicit?: LensDatasourceId): LensDatasourceId => {
    return explicit ?? getActiveDatasourceIdFromDoc(getAttributes()) ?? initialDatasourceId;
  };

  const updatePanelState = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string,
    datasourceId?: LensDatasourceId
  ) => {
    const vis = getAttributes();
    const activeDatasourceId = resolveActiveDatasourceId(datasourceId);
    const datasourceStates: DatasourceStates = {
      [activeDatasourceId]: {
        isLoading: false,
        state: datasourceState,
      },
    };
    const newVis = mergeToNewDoc(
      vis,
      {
        activeId: visualizationType || vis.visualizationType,
        state: visualizationState,
        selectedLayerId: null,
      },
      datasourceStates,
      vis.state.query,
      vis.state.filters,
      activeDatasourceId,
      vis.state.adHocDataViews || {},
      { visualizationMap, datasourceMap, extractFilterReferences }
    );
    const newDoc: TypedLensSerializedState['attributes'] = {
      ...vis,
      ...newVis,
      visualizationType: newVis?.visualizationType ?? vis.visualizationType,
    };

    if (newDoc.state) {
      updateAttributes(newDoc, true);
    }
  };

  const updateSuggestion = updateAttributes;

  return { updateSuggestion, updatePanelState };
}
