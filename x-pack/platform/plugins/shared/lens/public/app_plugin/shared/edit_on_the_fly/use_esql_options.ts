/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import {
  LENS_DATASOURCE_ID,
  LENS_LAYER_TYPES,
  type FormBasedPrivateState,
  type FramePublicAPI,
  type Visualization,
  type VisualizationState,
} from '@kbn/lens-common';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  getFormBasedEsqlAvailability,
  type FormBasedEsqlAvailability,
} from '../../../datasources/form_based/esql_availability';
import { updateDatasourceState, useLensDispatch, useLensSelector } from '../../../state_management';

interface EsqlOptions {
  showEsqlOptions: boolean;
  useEsql: boolean;
  availability: FormBasedEsqlAvailability;
  onUseEsqlChange: (useEsql: boolean) => void;
}

export const useEsqlOptions = ({
  isTextBasedMode,
  layerIds,
  visualization,
  activeVisualization,
  framePublicAPI,
  coreStart,
  startDependencies,
}: {
  isTextBasedMode: boolean;
  layerIds: string[];
  visualization: VisualizationState;
  activeVisualization: Visualization | undefined;
  framePublicAPI: FramePublicAPI;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
}): EsqlOptions => {
  const dispatch = useLensDispatch();
  const { datasourceStates } = useLensSelector((state) => state.lens);
  const formBasedState = datasourceStates[LENS_DATASOURCE_ID.FORM_BASED]?.state as
    | FormBasedPrivateState
    | undefined;

  const isEsqlEnabledInSettings = Boolean(coreStart.uiSettings.get(ENABLE_ESQL));
  const showEsqlOptions = !isTextBasedMode && isEsqlEnabledInSettings && Boolean(formBasedState);

  const availability = useMemo<FormBasedEsqlAvailability>(() => {
    if (!showEsqlOptions || !formBasedState || !activeVisualization) {
      return { isAvailable: true };
    }

    // Only layers of this datasource are checked, and reference lines and annotations are not
    // fetched with an aggregation query.
    const fetchedLayerIds = layerIds.filter((layerId) => {
      if (!formBasedState.layers[layerId]) return false;

      const layerType =
        activeVisualization.getLayerType(layerId, visualization.state) ?? LENS_LAYER_TYPES.DATA;
      return layerType === LENS_LAYER_TYPES.DATA || layerType === LENS_LAYER_TYPES.METRIC_TRENDLINE;
    });

    return getFormBasedEsqlAvailability({
      layers: formBasedState.layers,
      layerIds: fetchedLayerIds,
      indexPatterns: framePublicAPI.dataViews.indexPatterns,
      uiSettings: coreStart.uiSettings,
      dateRange: framePublicAPI.dateRange,
      nowInstant: startDependencies.data.nowProvider.get(),
    });
  }, [
    showEsqlOptions,
    formBasedState,
    activeVisualization,
    layerIds,
    visualization.state,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    coreStart.uiSettings,
    startDependencies.data.nowProvider,
  ]);

  const onUseEsqlChange = useCallback(
    (useEsql: boolean) => {
      if (!formBasedState) return;

      dispatch(
        updateDatasourceState({
          datasourceId: LENS_DATASOURCE_ID.FORM_BASED,
          newDatasourceState: { ...formBasedState, useEsql },
          dontSyncLinkedDimensions: true,
        })
      );
    },
    [dispatch, formBasedState]
  );

  return {
    showEsqlOptions,
    useEsql: Boolean(formBasedState?.useEsql),
    availability,
    onUseEsqlChange,
  };
};
