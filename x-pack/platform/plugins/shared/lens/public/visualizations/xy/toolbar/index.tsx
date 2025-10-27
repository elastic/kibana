/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Position } from '@elastic/charts';
import { ScaleType } from '@elastic/charts';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import { TooltipWrapper } from '@kbn/visualization-utils';
import type { AxesSettingsConfig, VisualizationToolbarProps, XYState } from '@kbn/lens-common';
import { LegendSize } from '@kbn/chart-expressions-common';
import type { LegendSettingsProps } from '../../../shared_components/legend/legend_settings';
import { hasBarSeries, isHorizontalChart } from '../state_helpers';
import { hasNumericHistogramDimension, LegendSettingsPopover } from '../../../shared_components';
import { AxisSettingsPopover } from './axis_settings';
import { getAxesConfiguration, getXDomain } from '../axes_configuration';
import { VisualOptionsPopover } from './visual_options_popover';
import { TextPopover } from './titles_and_text_popover';
import { getScaleType } from '../to_expression';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
import { getDataLayers } from '../visualization_helpers';
import type { AxesSettingsConfigKeys } from '../../../shared_components';
import { defaultLegendTitle, legendOptions, xyLegendValues } from './legend_settings';
import { axisKeyToTitleMapping, getDataBounds, hasPercentageAxis } from './style_settings';

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

export function updateLayer(
  state: XYState,
  layer: UnwrapArray<XYState['layers']>,
  index: number
): XYState {
  return {
    ...state,
    layers: state.layers.map((l, i) => (i === index ? layer : l)),
  };
}

/**
 *  TODO: Delete this component after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */
export const XyToolbar = memo(function XyToolbar(props: VisualizationToolbarProps<XYState>) {
  const { state, setState, frame } = props;
  const dataLayers = getDataLayers(state?.layers);
  const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
  const axisGroups = getAxesConfiguration(dataLayers, shouldRotate, frame.activeData);
  const dataBounds = getDataBounds(frame.activeData, axisGroups);
  const xDataBounds = getXDomain(dataLayers, frame.activeData);

  const tickLabelsVisibilitySettings = {
    x: state?.tickLabelsVisibilitySettings?.x ?? true,
    yLeft: state?.tickLabelsVisibilitySettings?.yLeft ?? true,
    yRight: state?.tickLabelsVisibilitySettings?.yRight ?? true,
  };
  const onTickLabelsVisibilitySettingsChange = (optionId: AxesSettingsConfigKeys): void => {
    const newTickLabelsVisibilitySettings = {
      ...tickLabelsVisibilitySettings,
      ...{
        [optionId]: !tickLabelsVisibilitySettings[optionId],
      },
    };
    setState({
      ...state,
      tickLabelsVisibilitySettings: newTickLabelsVisibilitySettings,
    });
  };

  const gridlinesVisibilitySettings = {
    x: state?.gridlinesVisibilitySettings?.x ?? true,
    yLeft: state?.gridlinesVisibilitySettings?.yLeft ?? true,
    yRight: state?.gridlinesVisibilitySettings?.yRight ?? true,
  };

  const onGridlinesVisibilitySettingsChange = (optionId: AxesSettingsConfigKeys): void => {
    const newGridlinesVisibilitySettings = {
      ...gridlinesVisibilitySettings,
      ...{
        [optionId]: !gridlinesVisibilitySettings[optionId],
      },
    };
    setState({
      ...state,
      gridlinesVisibilitySettings: newGridlinesVisibilitySettings,
    });
  };

  const labelsOrientation = {
    x: state?.labelsOrientation?.x ?? 0,
    yLeft: state?.labelsOrientation?.yLeft ?? 0,
    yRight: state?.labelsOrientation?.yRight ?? 0,
  };

  const onLabelsOrientationChange = (axis: AxesSettingsConfigKeys, orientation: number): void => {
    const newLabelsOrientation = {
      ...labelsOrientation,
      ...{
        [axis]: orientation,
      },
    };
    setState({
      ...state,
      labelsOrientation: newLabelsOrientation,
    });
  };

  const axisTitlesVisibilitySettings = useMemo(
    () => ({
      x: state?.axisTitlesVisibilitySettings?.x ?? true,
      yLeft: state?.axisTitlesVisibilitySettings?.yLeft ?? true,
      yRight: state?.axisTitlesVisibilitySettings?.yRight ?? true,
    }),
    [
      state?.axisTitlesVisibilitySettings?.x,
      state?.axisTitlesVisibilitySettings?.yLeft,
      state?.axisTitlesVisibilitySettings?.yRight,
    ]
  );

  const onTitleStateChange = useCallback(
    ({ title, visible }: { title?: string; visible: boolean }, axis: keyof AxesSettingsConfig) =>
      setState({
        ...state,
        [axisKeyToTitleMapping[axis]]: title,
        axisTitlesVisibilitySettings: { ...axisTitlesVisibilitySettings, [axis]: visible },
      }),
    [axisTitlesVisibilitySettings, setState, state]
  );
  const nonOrdinalXAxis = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        props.frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ??
          null,
        ScaleType.Linear
      ) !== 'ordinal'
  );

  const isTimeVis = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        props.frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ??
          null,
        ScaleType.Linear
      ) === ScaleType.Time
  );

  // only allow changing endzone visibility if it could show up theoretically (if it's a time viz)
  const onChangeEndzoneVisiblity = isTimeVis
    ? (checked: boolean): void => {
        setState({
          ...state,
          hideEndzones: !checked,
        });
      }
    : undefined;

  const onChangeCurrentTimeMarkerVisibility = isTimeVis
    ? (checked: boolean): void => {
        setState({
          ...state,
          showCurrentTimeMarker: checked,
        });
      }
    : undefined;

  const legendMode =
    state?.legend.isVisible && !state?.legend.showSingleSeries
      ? 'auto'
      : !state?.legend.isVisible
      ? 'hide'
      : 'show';
  const hasBarOrAreaOnLeftAxis = Boolean(
    axisGroups
      .find((group) => group.groupId === 'left')
      ?.series?.some((series) => {
        const seriesType = dataLayers.find((l) => l.layerId === series.layer)?.seriesType;
        return seriesType?.includes('bar') || seriesType?.includes('area');
      })
  );

  const setScaleWithExtentFn = useCallback(
    (extentKey: 'yLeftExtent' | 'yRightExtent', scaleKey: 'yLeftScale' | 'yRightScale') =>
      (extent?: AxisExtentConfig, scale?: YScaleType) => {
        setState({
          ...state,
          [extentKey]: extent,
          [scaleKey]: scale,
        });
      },
    [setState, state]
  );

  const setExtentFn = useCallback(
    (extentKey: 'xExtent' | 'yLeftExtent' | 'yRightExtent') => (extent?: AxisExtentConfig) => {
      setState({
        ...state,
        [extentKey]: extent,
      });
    },
    [setState, state]
  );

  const setScaleFn = useCallback(
    (scaleKey: 'yLeftScale' | 'yRightScale') => (scale?: YScaleType) => {
      setState({
        ...state,
        [scaleKey]: scale,
      });
    },
    [setState, state]
  );

  const hasBarOrAreaOnRightAxis = Boolean(
    axisGroups
      .find((group) => group.groupId === 'right')
      ?.series?.some((series) => {
        const seriesType = dataLayers.find((l) => l.layerId === series.layer)?.seriesType;
        return seriesType?.includes('bar') || seriesType?.includes('area');
      })
  );

  const filteredBarLayers = dataLayers.filter((layer) => layer.seriesType.includes('bar'));
  const chartHasMoreThanOneBarSeries =
    filteredBarLayers.length > 1 ||
    filteredBarLayers.some((layer) => layer.accessors.length > 1 || layer.splitAccessor);

  const isTimeHistogramModeEnabled = dataLayers.some(
    ({ xAccessor, layerId, seriesType, splitAccessor }) => {
      if (!xAccessor) {
        return false;
      }
      const xAccessorOp =
        props.frame.datasourceLayers[layerId]?.getOperationForColumnId(xAccessor) ?? null;
      return (
        getScaleType(xAccessorOp, ScaleType.Linear) === ScaleType.Time &&
        xAccessorOp?.isBucketed &&
        (seriesType.includes('stacked') || !splitAccessor) &&
        (seriesType.includes('stacked') ||
          !seriesType.includes('bar') ||
          !chartHasMoreThanOneBarSeries)
      );
    }
  );

  const hasNumberHistogram = dataLayers.some(({ layerId, xAccessor }) =>
    hasNumericHistogramDimension(props.frame.datasourceLayers[layerId], xAccessor)
  );

  // Ask the datasource if it has a say about default truncation value
  const defaultParamsFromDatasources = getDefaultVisualValuesForLayer(
    state,
    props.frame.datasourceLayers
  ).truncateText;

  const legendSize = state.legend.legendSize;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <VisualOptionsPopover
          state={state}
          setState={setState}
          datasourceLayers={frame.datasourceLayers}
        />
      </EuiFlexItem>
      {hasBarSeries(state.layers) && (
        <EuiFlexItem grow={false}>
          <TextPopover
            state={state}
            setState={setState}
            datasourceLayers={frame.datasourceLayers}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <TooltipWrapper
            tooltipContent={
              shouldRotate
                ? i18n.translate('xpack.lens.xyChart.bottomAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when bottom axis is enabled.',
                  })
                : i18n.translate('xpack.lens.xyChart.leftAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when left axis is enabled.',
                  })
            }
            condition={
              Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length === 0
            }
          >
            <AxisSettingsPopover
              axis="yLeft"
              layers={state?.layers}
              axisTitle={state?.yTitle}
              updateTitleState={onTitleStateChange}
              areTickLabelsVisible={tickLabelsVisibilitySettings.yLeft}
              toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
              areGridlinesVisible={gridlinesVisibilitySettings.yLeft}
              toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
              isDisabled={
                Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length === 0
              }
              orientation={labelsOrientation.yLeft}
              setOrientation={onLabelsOrientationChange}
              isTitleVisible={axisTitlesVisibilitySettings.yLeft}
              extent={state?.yLeftExtent || { mode: 'full' }}
              setExtent={setExtentFn('yLeftExtent')}
              hasBarOrAreaOnAxis={hasBarOrAreaOnLeftAxis}
              dataBounds={dataBounds.left}
              hasPercentageAxis={hasPercentageAxis(axisGroups, 'left', state)}
              scale={state?.yLeftScale}
              setScale={setScaleFn('yLeftScale')}
              setScaleWithExtent={setScaleWithExtentFn('yLeftExtent', 'yLeftScale')}
            />
          </TooltipWrapper>

          <AxisSettingsPopover
            axis="x"
            layers={state?.layers}
            axisTitle={state?.xTitle}
            updateTitleState={onTitleStateChange}
            areTickLabelsVisible={tickLabelsVisibilitySettings.x}
            toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
            areGridlinesVisible={gridlinesVisibilitySettings.x}
            toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
            orientation={labelsOrientation.x}
            setOrientation={onLabelsOrientationChange}
            isTitleVisible={axisTitlesVisibilitySettings.x}
            endzonesVisible={!state?.hideEndzones}
            setEndzoneVisibility={onChangeEndzoneVisiblity}
            currentTimeMarkerVisible={state?.showCurrentTimeMarker}
            setCurrentTimeMarkerVisibility={onChangeCurrentTimeMarkerVisibility}
            hasBarOrAreaOnAxis={false}
            hasPercentageAxis={false}
            useMultilayerTimeAxis={isTimeHistogramModeEnabled && !shouldRotate}
            extent={hasNumberHistogram ? state?.xExtent || { mode: 'dataBounds' } : undefined}
            setExtent={setExtentFn('xExtent')}
            dataBounds={xDataBounds}
          />

          <TooltipWrapper
            tooltipContent={
              shouldRotate
                ? i18n.translate('xpack.lens.xyChart.topAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when top axis is enabled.',
                  })
                : i18n.translate('xpack.lens.xyChart.rightAxisDisabledHelpText', {
                    defaultMessage: 'This setting only applies when right axis is enabled.',
                  })
            }
            condition={
              Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length === 0
            }
          >
            <AxisSettingsPopover
              axis="yRight"
              layers={state?.layers}
              axisTitle={state?.yRightTitle}
              updateTitleState={onTitleStateChange}
              areTickLabelsVisible={tickLabelsVisibilitySettings.yRight}
              toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
              areGridlinesVisible={gridlinesVisibilitySettings.yRight}
              toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
              isDisabled={
                Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length ===
                0
              }
              orientation={labelsOrientation.yRight}
              setOrientation={onLabelsOrientationChange}
              hasPercentageAxis={hasPercentageAxis(axisGroups, 'right', state)}
              isTitleVisible={axisTitlesVisibilitySettings.yRight}
              extent={state?.yRightExtent || { mode: 'full' }}
              setExtent={setExtentFn('yRightExtent')}
              hasBarOrAreaOnAxis={hasBarOrAreaOnRightAxis}
              dataBounds={dataBounds.right}
              scale={state?.yRightScale}
              setScale={setScaleFn('yRightScale')}
              setScaleWithExtent={setScaleWithExtentFn('yRightExtent', 'yRightScale')}
            />
          </TooltipWrapper>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <LegendSettingsPopover
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
            frame.activeData?.[dataLayers[0].layerId]?.columns.find(
              (col) => col.id === dataLayers[0].splitAccessor
            )?.name ?? defaultLegendTitle
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
