/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DatasourceMap,
  Visualization,
  VisualizationLayerWidgetProps,
  VisualizationMap,
} from '../../../types';
import { StaticHeader } from '../../../shared_components';
import { ChartSwitch } from '../workspace_panel/chart_switch';

export function LayerSettings({
  activeVisualization,
  layerConfigProps,
  visualizationMap,
  datasourceMap,
  shouldDisplayChartSwitch,
}: {
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  activeVisualization: Visualization;
  layerConfigProps: VisualizationLayerWidgetProps;
  shouldDisplayChartSwitch?: boolean;
}) {
  if (shouldDisplayChartSwitch) {
    return (
      <ChartSwitch
        datasourceMap={datasourceMap}
        visualizationMap={visualizationMap}
        framePublicAPI={layerConfigProps.frame}
        size="s"
      />
    );
  }
  if (!activeVisualization.LayerHeaderComponent) {
    const description = activeVisualization.getDescription(layerConfigProps.state);
    return <StaticHeader label={description.label} icon={description.icon} />;
  }

  return <activeVisualization.LayerHeaderComponent {...layerConfigProps} />;
}
