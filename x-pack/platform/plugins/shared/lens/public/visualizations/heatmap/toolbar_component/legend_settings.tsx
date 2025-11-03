/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import type { Position } from '@elastic/charts';
import { LegendSize } from '@kbn/chart-expressions-common';

import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { HeatmapVisualizationState } from '../types';
import { LegendSettings } from '../../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';

export const HeatmapLegendSettings = ({
  state,
  setState,
  frame,
}: VisualizationToolbarProps<HeatmapVisualizationState>) => {
  const legendMode = state.legend.isVisible ? 'show' : 'hide';

  const defaultTruncationValue = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  const legendSize = state?.legend.legendSize;

  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

  return (
    <LegendSettings
      legendOptions={legendOptions}
      mode={legendMode}
      onDisplayChange={(optionId) => {
        const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
        if (newMode === 'show') {
          setState({
            ...state,
            legend: { ...state.legend, isVisible: true },
          });
        } else if (newMode === 'hide') {
          setState({
            ...state,
            legend: { ...state.legend, isVisible: false },
          });
        }
      }}
      position={state?.legend.position}
      onPositionChange={(id) => {
        setState({
          ...state,
          legend: { ...state.legend, position: id as Position },
        });
      }}
      maxLines={state?.legend.maxLines}
      onMaxLinesChange={(val) => {
        setState({
          ...state,
          legend: { ...state.legend, maxLines: val },
        });
      }}
      shouldTruncate={state?.legend.shouldTruncate ?? defaultTruncationValue}
      onTruncateLegendChange={() => {
        const current = state.legend.shouldTruncate ?? defaultTruncationValue;
        setState({
          ...state,
          legend: { ...state.legend, shouldTruncate: !current },
        });
      }}
      legendSize={legendSize}
      onLegendSizeChange={(newLegendSize) => {
        setState({
          ...state,
          legend: {
            ...state.legend,
            legendSize: newLegendSize,
          },
        });
      }}
      showAutoLegendSizeOption={hadAutoLegendSize}
    />
  );
};

export const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> =
  [
    {
      id: `heatmap_legend_show`,
      value: 'show',
      label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.show', {
        defaultMessage: 'Show',
      }),
    },
    {
      id: `heatmap_legend_hide`,
      value: 'hide',
      label: i18n.translate('xpack.lens.heatmapChart.legendVisibility.hide', {
        defaultMessage: 'Hide',
      }),
    },
  ];
