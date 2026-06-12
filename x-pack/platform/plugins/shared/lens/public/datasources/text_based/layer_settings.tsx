/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DatasourceLayerSettingsProps, TextBasedPrivateState } from '@kbn/lens-common';
import { IgnoreGlobalFilterRowControl } from '../../shared_components/ignore_global_filter';
import { trackUiCounterEvents } from '../../lens_ui_telemetry';

export function LayerSettingsPanel({
  state,
  setState,
  layerId,
}: DatasourceLayerSettingsProps<TextBasedPrivateState>) {
  return (
    <IgnoreGlobalFilterRowControl
      checked={!state.layers[layerId].ignoreGlobalFilters}
      onChange={() => {
        const newLayer = {
          ...state.layers[layerId],
          ignoreGlobalFilters: !state.layers[layerId].ignoreGlobalFilters,
        };
        const newLayers = { ...state.layers };
        newLayers[layerId] = newLayer;
        trackUiCounterEvents(
          newLayer.ignoreGlobalFilters ? `ignore_global_filters` : `use_global_filters`
        );
        setState({ ...state, layers: newLayers });
      }}
    />
  );
}
