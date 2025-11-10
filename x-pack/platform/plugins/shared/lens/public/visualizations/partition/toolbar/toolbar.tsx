/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Position } from '@elastic/charts';
import { LegendSize } from '@kbn/chart-expressions-common';
import { type PartitionLegendValue } from '@kbn/expression-partition-vis-plugin/common';
import type {
  LensPartitionVisualizationState as PieVisualizationState,
  VisualizationToolbarProps,
} from '@kbn/lens-common';
import { PARTITION_EMPTY_SIZE_RADIUS as EmptySizeRatios } from '@kbn/lens-common';
import { PartitionChartsMeta } from '../partition_charts_meta';
import { ToolbarPopover, LegendSettingsPopover } from '../../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
import { getLegendStats } from '../render_helpers';
import { PartitionAppearanceSettings } from './appearance_settings';
import { PartitionTitlesAndTextSettings } from './titles_and_text_setttings';
import { legendOptions, partitionLegendValues } from './legend_settings';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

const PANEL_STYLE = {
  width: '500px',
};

export function PieToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { state, setState, frame } = props;
  const layer = state.layers[0];
  const { emptySizeRatioOptions, isDisabled: isToolbarPopoverDisabled } =
    PartitionChartsMeta[state.shape].toolbarPopover;

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

  const selectedOption = emptySizeRatioOptions
    ? emptySizeRatioOptions.find(
        ({ value }) =>
          value === (state.shape === 'pie' ? 0 : layer.emptySizeRatio ?? EmptySizeRatios.SMALL)
      )
    : undefined;

  if (!layer) {
    return null;
  }

  const defaultTruncationValue = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {emptySizeRatioOptions?.length && selectedOption ? (
        <EuiFlexItem grow={false}>
          <ToolbarPopover
            title={i18n.translate('xpack.lens.pieChart.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            data-test-subj="lnsVisualOptionsPopover"
          >
            <PartitionAppearanceSettings {...props} />
          </ToolbarPopover>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <ToolbarPopover
          title={i18n.translate('xpack.lens.pieChart.titlesAndTextLabel', {
            defaultMessage: 'Titles and text',
          })}
          isDisabled={Boolean(isToolbarPopoverDisabled)}
          type="titlesAndText"
          panelStyle={PANEL_STYLE}
        >
          <PartitionTitlesAndTextSettings {...props} />
        </ToolbarPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LegendSettingsPopover<PartitionLegendValue>
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
