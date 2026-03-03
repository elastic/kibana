/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Position } from '@elastic/charts';
import { LegendValue, ScaleType } from '@elastic/charts';
import type { XYLegendValue } from '@kbn/chart-expressions-common';
import { LegendSize } from '@kbn/chart-expressions-common';
import type { VisualizationToolbarProps, XYState } from '@kbn/lens-common';
import { MULTI_FIELD_KEY_SEPARATOR } from '@kbn/data-plugin/common';
import type { LegendSettingsProps } from '../../../shared_components/legend/legend_settings';
import { getScaleType } from '../to_expression';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
import { getDataLayers } from '../visualization_helpers';
import { LegendSettings } from '../../../shared_components';

export const defaultLegendTitle = i18n.translate('xpack.lens.xyChart.legendTitle', {
  defaultMessage: 'Legend',
});

export const XyLegendSettings = ({
  state,
  setState,
  frame,
}: VisualizationToolbarProps<XYState>) => {
  const legendMode =
    state?.legend.isVisible && !state?.legend.showSingleSeries
      ? 'auto'
      : !state?.legend.isVisible
      ? 'hide'
      : 'show';

  const dataLayers = getDataLayers(state?.layers);

  const defaultParamsFromDatasources = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  const nonOrdinalXAxis = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ?? null,
        ScaleType.Linear
      ) !== 'ordinal'
  );

  const legendSize = state.legend.legendSize;

  const splitAccessorNames =
    dataLayers[0].splitAccessors?.reduce<string[]>((acc, accessor) => {
      const column = frame.activeData?.[dataLayers[0].layerId]?.columns.find(
        (c) => c.id === accessor
      );
      if (column?.name) {
        acc.push(column.name);
      }
      return acc;
    }, []) ?? [];

  return (
    <LegendSettings
      legendOptions={legendOptions}
      mode={legendMode}
      location={state?.legend.isInside ? 'inside' : 'outside'}
      onLocationChange={(location) => {
        setState({
          ...state,
          legend: {
            ...state.legend,
            isInside: location === 'inside',
          },
        });
      }}
      titlePlaceholder={
        splitAccessorNames.length > 0
          ? splitAccessorNames.join(MULTI_FIELD_KEY_SEPARATOR)
          : defaultLegendTitle
      }
      legendTitle={state?.legend.title}
      onLegendTitleChange={({ title, visible }) => {
        setState({
          ...state,
          legend: {
            ...state.legend,
            title,
            isTitleVisible: visible,
          },
        });
      }}
      isTitleVisible={state?.legend.isTitleVisible}
      onDisplayChange={(optionId) => {
        const newMode = legendOptions.find(({ id }) => id === optionId)!.value;
        setState({
          ...state,
          legend: {
            ...state.legend,
            isVisible: newMode !== 'hide',
            showSingleSeries: newMode === 'show',
          },
        });
      }}
      position={state?.legend.position}
      horizontalAlignment={state?.legend.horizontalAlignment}
      verticalAlignment={state?.legend.verticalAlignment}
      floatingColumns={state?.legend.floatingColumns}
      onFloatingColumnsChange={(val) => {
        setState({
          ...state,
          legend: { ...state.legend, floatingColumns: val },
        });
      }}
      maxLines={state?.legend.maxLines}
      onMaxLinesChange={(val) => {
        setState({
          ...state,
          legend: { ...state.legend, maxLines: val },
        });
      }}
      shouldTruncate={state?.legend.shouldTruncate ?? defaultParamsFromDatasources}
      onTruncateLegendChange={() => {
        const current = state?.legend.shouldTruncate ?? defaultParamsFromDatasources;
        setState({
          ...state,
          legend: { ...state.legend, shouldTruncate: !current },
        });
      }}
      onPositionChange={(id) => {
        setState({
          ...state,
          legend: { ...state.legend, position: id as Position },
        });
      }}
      onAlignmentChange={(value) => {
        const [vertical, horizontal] = value.split('_');
        const verticalAlignment = vertical as LegendSettingsProps['verticalAlignment'];
        const horizontalAlignment = horizontal as LegendSettingsProps['horizontalAlignment'];

        setState({
          ...state,
          legend: { ...state.legend, verticalAlignment, horizontalAlignment },
        });
      }}
      allowedLegendStats={nonOrdinalXAxis ? xyLegendValues : undefined}
      legendStats={state?.legend.legendStats}
      onLegendStatsChange={(legendStats, hasConvertedToTable) => {
        setState({
          ...state,
          legend: {
            ...state.legend,
            legendStats,
            isVisible: true,
            showSingleSeries: true,
            ...(hasConvertedToTable ? { legendSize: LegendSize.AUTO } : {}),
          },
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
      showAutoLegendSizeOption={true}
    />
  );
};

export const legendOptions: Array<{
  id: string;
  value: 'auto' | 'show' | 'hide';
  label: string;
}> = [
  {
    id: `xy_legend_auto`,
    value: 'auto',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: `xy_legend_show`,
    value: 'show',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: `xy_legend_hide`,
    value: 'hide',
    label: i18n.translate('xpack.lens.xyChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

export const xyLegendValues: Array<{
  value: XYLegendValue;
  label: string;
  toolTipContent: string;
}> = [
  {
    value: LegendValue.Average,
    label: i18n.translate('xpack.lens.shared.legendValues.average', {
      defaultMessage: 'Average',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.averageDesc', {
      defaultMessage: 'Average of all values in the series.',
    }),
  },
  {
    value: LegendValue.Median,
    label: i18n.translate('xpack.lens.shared.legendValues.median', {
      defaultMessage: 'Median',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.medianDesc', {
      defaultMessage: 'Median value in the series.',
    }),
  },
  {
    value: LegendValue.Min,
    label: i18n.translate('xpack.lens.shared.legendValues.min', {
      defaultMessage: 'Minimum',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.minDesc', {
      defaultMessage: 'Minimum value in the series.',
    }),
  },
  {
    value: LegendValue.Max,
    label: i18n.translate('xpack.lens.shared.legendValues.max', {
      defaultMessage: 'Maximum',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.maxDesc', {
      defaultMessage: 'Maximum value in the series.',
    }),
  },
  {
    value: LegendValue.Range,
    label: i18n.translate('xpack.lens.shared.legendValues.range', {
      defaultMessage: 'Range',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.rangeDesc', {
      defaultMessage: 'Difference between the min and the max in the series.',
    }),
  },
  {
    value: LegendValue.LastValue,
    label: i18n.translate('xpack.lens.shared.legendValues.lastValue', {
      defaultMessage: 'Last value',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.lastValueDesc', {
      defaultMessage: 'Last value in the series.',
    }),
  },
  {
    value: LegendValue.LastNonNullValue,
    label: i18n.translate('xpack.lens.shared.legendValues.lastNonNullValue', {
      defaultMessage: 'Last non-null value',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.lastNonNullValueDesc', {
      defaultMessage: 'Last non-null value in the series.',
    }),
  },
  {
    value: LegendValue.FirstValue,
    label: i18n.translate('xpack.lens.shared.legendValues.firstValue', {
      defaultMessage: 'First value',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.firstValueDesc', {
      defaultMessage: 'First value in the series.',
    }),
  },
  {
    value: LegendValue.FirstNonNullValue,
    label: i18n.translate('xpack.lens.shared.legendValues.firstNonNullValue', {
      defaultMessage: 'First non-null value',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.firstNonNullValueDesc', {
      defaultMessage: 'First non-null value in the series.',
    }),
  },
  {
    value: LegendValue.Difference,
    label: i18n.translate('xpack.lens.shared.legendValues.diff', {
      defaultMessage: 'Difference',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.diffDesc', {
      defaultMessage: 'Difference between first and last value in the series.',
    }),
  },
  {
    value: LegendValue.DifferencePercent,
    label: i18n.translate('xpack.lens.shared.legendValues.diffPercent', {
      defaultMessage: 'Difference %',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.diffPercentDesc', {
      defaultMessage: 'Difference in percent between first and last value in the series.',
    }),
  },
  {
    value: LegendValue.Total,
    label: i18n.translate('xpack.lens.shared.legendValues.total', {
      defaultMessage: 'Sum',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.totalDesc', {
      defaultMessage: 'The sum of all values in the series.',
    }),
  },
  {
    value: LegendValue.Count,
    label: i18n.translate('xpack.lens.shared.legendValues.count', {
      defaultMessage: 'Count',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.countDesc', {
      defaultMessage: 'Count of all the values in the series.',
    }),
  },
  {
    value: LegendValue.DistinctCount,
    label: i18n.translate('xpack.lens.shared.legendValues.distinctCount', {
      defaultMessage: 'Distinct count',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.distinctCountDesc', {
      defaultMessage: 'Count of distinct values in the series.',
    }),
  },
  {
    value: LegendValue.Variance,
    label: i18n.translate('xpack.lens.shared.legendValues.variance', {
      defaultMessage: 'Variance',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.varianceDesc', {
      defaultMessage: 'Variance of all the values in the series.',
    }),
  },
  {
    value: LegendValue.StdDeviation,
    label: i18n.translate('xpack.lens.shared.legendValues.stdDev', {
      defaultMessage: 'Std deviation',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.stdDevDesc', {
      defaultMessage: 'Standard deviation of all the values in the series.',
    }),
  },
  // Moved to the bottom to limit its usage. It could cause some UX issues due to the dynamic nature
  // of the data displayed
  {
    value: LegendValue.CurrentAndLastValue,
    label: i18n.translate('xpack.lens.shared.legendValues.currentValue', {
      defaultMessage: 'Current or last value',
    }),
    toolTipContent: i18n.translate('xpack.lens.shared.legendValues.currentValueDesc', {
      defaultMessage:
        'Value of the bucket being hovered or the last bucket value when not hovering.',
    }),
  },
];
