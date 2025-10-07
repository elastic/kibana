/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapAttributes } from '@kbn/maps-plugin/server/content_management/schema/v1/map_attributes_schema/types';
import React from 'react';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { useMapInput } from './use_map_input';
import { BaseMapVisualization } from '../shared/base_map_visualization';

export function VisualizeMaps({
  uiActions,
  mapConfig,
}: {
  uiActions: UiActionsStart;
  mapConfig: MapAttributes;
}) {
  const { mapInput, setMapInput, isLoading } = useMapInput({
    mapConfig,
  });

  return (
    <BaseMapVisualization
      uiActions={uiActions}
      mapInput={mapInput}
      mapConfig={mapConfig}
      setMapInput={setMapInput}
      isLoading={isLoading}
    />
  );
}
