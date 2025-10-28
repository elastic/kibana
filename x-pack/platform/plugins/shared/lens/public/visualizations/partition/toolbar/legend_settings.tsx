/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Position } from '@elastic/charts';
import { LegendValue } from '@elastic/charts';
import { LegendSize } from '@kbn/chart-expressions-common';
import { type PartitionLegendValue } from '@kbn/expression-partition-vis-plugin/common';
import type {
  LensPartitionVisualizationState as PieVisualizationState,
  SharedPartitionLayerState as SharedPieLayerState,
  VisualizationToolbarProps,
} from '@kbn/lens-common';
import { PartitionChartsMeta } from '../partition_charts_meta';
import { LegendDisplay } from '../../../../common/constants';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
import { getLegendStats } from '../render_helpers';
import { LegendSettings } from '../../../shared_components';

export const PartitionLegendSettings = ({
  state,
  setState,
  frame,
}: VisualizationToolbarProps<PieVisualizationState>) => {
  const layer = state.layers[0];

  const legendSize = layer.legendSize;

  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

  const onStateChange = useCallback(
    (part: Record<string, unknown>) => {
      setState({
        ...state,
        layers: [{ ...layer, ...part }],
      });
    },
    [layer, state, setState]
  );

  const onLegendDisplayChange = useCallback(
    (optionId: unknown) => {
      onStateChange({ legendDisplay: legendOptions.find(({ id }) => id === optionId)!.value });
    },
    [onStateChange]
  );

  const onLegendPositionChange = useCallback(
    (id: unknown) => onStateChange({ legendPosition: id as Position }),
    [onStateChange]
  );

  const onNestedLegendChange = useCallback(
    (id: unknown) => onStateChange({ nestedLegend: !layer.nestedLegend }),
    [layer, onStateChange]
  );

  const onTruncateLegendChange = useCallback(() => {
    const current = layer.truncateLegend ?? true;
    onStateChange({ truncateLegend: !current });
  }, [layer, onStateChange]);

  const onLegendMaxLinesChange = useCallback(
    (val: unknown) => onStateChange({ legendMaxLines: val }),
    [onStateChange]
  );

  const onLegendSizeChange = useCallback(
    (val: unknown) => onStateChange({ legendSize: val }),
    [onStateChange]
  );

  const onLegendStatsChange = useCallback(
    (legendStats: unknown) => {
      onStateChange({ legendStats });
    },
    [onStateChange]
  );

  const defaultTruncationValue = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  return (
    <LegendSettings<PartitionLegendValue>
      groupPosition={'none'}
      legendOptions={legendOptions}
      mode={layer.legendDisplay}
      onDisplayChange={onLegendDisplayChange}
      legendStats={getLegendStats(layer, state.shape)}
      allowedLegendStats={
        PartitionChartsMeta[state.shape]?.legend.defaultLegendStats
          ? partitionLegendValues
          : undefined
      }
      onLegendStatsChange={onLegendStatsChange}
      position={layer.legendPosition}
      onPositionChange={onLegendPositionChange}
      renderNestedLegendSwitch={
        !PartitionChartsMeta[state.shape]?.legend.hideNestedLegendSwitch &&
        layer.primaryGroups.length + (layer.secondaryGroups?.length ?? 0) > 1
      }
      nestedLegend={Boolean(layer.nestedLegend)}
      onNestedLegendChange={onNestedLegendChange}
      shouldTruncate={layer.truncateLegend ?? defaultTruncationValue}
      onTruncateLegendChange={onTruncateLegendChange}
      maxLines={layer?.legendMaxLines}
      onMaxLinesChange={onLegendMaxLinesChange}
      legendSize={legendSize}
      onLegendSizeChange={onLegendSizeChange}
      showAutoLegendSizeOption={hadAutoLegendSize}
    />
  );
};

export const partitionLegendValues = [
  {
    value: LegendValue.Value,
    label: i18n.translate('xpack.lens.shared.legendValues.value', {
      defaultMessage: 'Value',
    }),
  },
];

export const legendOptions: Array<{
  value: SharedPieLayerState['legendDisplay'];
  label: string;
  id: string;
}> = [
  {
    id: 'pieLegendDisplay-default',
    value: LegendDisplay.DEFAULT,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: 'pieLegendDisplay-show',
    value: LegendDisplay.SHOW,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: 'pieLegendDisplay-hide',
    value: LegendDisplay.HIDE,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];
