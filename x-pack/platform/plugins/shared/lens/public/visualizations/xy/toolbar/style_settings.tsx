/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ScaleType } from '@elastic/charts';
import type { AxisExtentConfig, YScaleType } from '@kbn/expression-xy-plugin/common';
import { TooltipWrapper } from '@kbn/visualization-utils';
import type {
  AxesSettingsConfig,
  FramePublicAPI,
  VisualizationToolbarProps,
  XYState,
} from '@kbn/lens-common';
import {
  hasNumericHistogramDimension,
  type AxesSettingsConfigKeys,
} from '../../../shared_components';
import { XyAppearanceSettings, getValueLabelDisableReason } from './appearance_settings';
import { XyTitlesAndTextSettings } from './titles_and_text_settings';
import { XyAxisSettings, axisConfig } from './axis_settings';
import type { AxisGroupConfiguration } from '../axes_configuration';
import { getAxesConfiguration, getXDomain } from '../axes_configuration';
import { getDataLayers } from '../visualization_helpers';
import {
  hasBarSeries,
  hasHistogramSeries,
  hasNonBarSeries,
  isHorizontalChart,
} from '../state_helpers';
import { getScaleType } from '../to_expression';

export const getDataBounds = function (
  activeData: FramePublicAPI['activeData'],
  axes: AxisGroupConfiguration[]
) {
  const groups: Partial<Record<string, { min: number; max: number }>> = {};
  axes.forEach((axis) => {
    let min = Number.MAX_SAFE_INTEGER;
    let max = -Number.MAX_SAFE_INTEGER;
    axis.series.forEach((series) => {
      activeData?.[series.layer]?.rows.forEach((row) => {
        const value = row[series.accessor];
        // TODO: add tests for null value
        if (value !== null && Number.isFinite(value)) {
          if (value < min) {
            min = value;
          }
          if (value > max) {
            max = value;
          }
        }
      });
    });
    if (min !== Number.MAX_SAFE_INTEGER && max !== -Number.MAX_SAFE_INTEGER) {
      groups[axis.groupId] = {
        min: Math.round((min + Number.EPSILON) * 100) / 100,
        max: Math.round((max + Number.EPSILON) * 100) / 100,
      };
    }
  });

  return groups;
};

export function hasPercentageAxis(
  axisGroups: AxisGroupConfiguration[],
  groupId: string,
  state: XYState
) {
  return Boolean(
    axisGroups
      .find((group) => group.groupId === groupId)
      ?.series.some(({ layer: layerId }) =>
        getDataLayers(state?.layers).find(
          (layer) => layer.layerId === layerId && layer.seriesType.includes('percentage')
        )
      )
  );
}

export const axisKeyToTitleMapping: Record<
  keyof AxesSettingsConfig,
  'xTitle' | 'yTitle' | 'yRightTitle'
> = {
  x: 'xTitle',
  yLeft: 'yTitle',
  yRight: 'yRightTitle',
};

type Props = VisualizationToolbarProps<XYState>;

export const XyStyleSettings: React.FC<Props> = (props) => {
  const { state, setState, frame } = props;
  const dataLayers = getDataLayers(state?.layers);
  const shouldRotate = state?.layers.length ? isHorizontalChart(state.layers) : false;
  const axisGroups = getAxesConfiguration(dataLayers, shouldRotate, frame.activeData);
  const dataBounds = getDataBounds(frame.activeData, axisGroups);
  const xDataBounds = getXDomain(dataLayers, frame.activeData);

  const isAreaPercentage = dataLayers.some(
    ({ seriesType }) => seriesType === 'area_percentage_stacked'
  );
  const isHasNonBarSeries = hasNonBarSeries(dataLayers);
  const isHistogramSeries = Boolean(hasHistogramSeries(dataLayers, frame.datasourceLayers));

  const isFittingEnabled = isHasNonBarSeries && !isAreaPercentage;
  const isCurveTypeEnabled = isHasNonBarSeries || isAreaPercentage;

  const valueLabelsDisabledReason = getValueLabelDisableReason({
    isAreaPercentage,
    isHistogramSeries,
  });

  const isAppearanceSettingDisabled = !isFittingEnabled && !isCurveTypeEnabled && isHasNonBarSeries;

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

  const isTimeVis = dataLayers.every(
    (layer) =>
      layer.xAccessor &&
      getScaleType(
        frame.datasourceLayers[layer.layerId]?.getOperationForColumnId(layer.xAccessor) ?? null,
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
    filteredBarLayers.some(
      (layer) => layer.accessors.length > 1 || (layer.splitAccessors ?? []).length > 0
    );

  const isTimeHistogramModeEnabled = dataLayers.some(
    ({ xAccessor, layerId, seriesType, splitAccessors }) => {
      if (!xAccessor) {
        return false;
      }
      const xAccessorOp =
        frame.datasourceLayers[layerId]?.getOperationForColumnId(xAccessor) ?? null;
      return (
        getScaleType(xAccessorOp, ScaleType.Linear) === ScaleType.Time &&
        xAccessorOp?.isBucketed &&
        (seriesType.includes('stacked') || (splitAccessors ?? []).length === 0) &&
        (seriesType.includes('stacked') ||
          !seriesType.includes('bar') ||
          !chartHasMoreThanOneBarSeries)
      );
    }
  );

  const hasNumberHistogram = dataLayers.some(({ layerId, xAccessor }) =>
    hasNumericHistogramDimension(frame.datasourceLayers[layerId], xAccessor)
  );

  const isHorizontal = state.layers?.length ? isHorizontalChart(state.layers) : false;

  return (
    <>
      {/* Appearance */}
      <EuiAccordion
        id={''}
        buttonContent={
          <TooltipWrapper
            tooltipContent={valueLabelsDisabledReason}
            condition={isAppearanceSettingDisabled}
          >
            <p>
              {i18n.translate('xpack.lens.visualization.toolbar.appearance', {
                defaultMessage: 'Appearance',
              })}
            </p>
          </TooltipWrapper>
        }
        paddingSize="s"
        initialIsOpen
        isDisabled={isAppearanceSettingDisabled}
      >
        <XyAppearanceSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      {/* Titles and text. Note: Hidden when Area and Line visualizations are selected */}
      {hasBarSeries(state.layers) && (
        <>
          <EuiAccordion
            id={''}
            buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
              defaultMessage: 'Titles and text',
            })}
            paddingSize="s"
            initialIsOpen
          >
            <XyTitlesAndTextSettings {...props} />
          </EuiAccordion>
          <EuiHorizontalRule margin="m" />
        </>
      )}
      <EuiAccordion
        id="yLeft-axis"
        data-test-subj="yLeft-axis"
        buttonContent={
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
            <p>{axisConfig('yLeft', isHorizontal).popoverTitle}</p>
          </TooltipWrapper>
        }
        paddingSize="s"
        initialIsOpen
        isDisabled={
          Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length === 0
        }
        {...(Object.keys(axisGroups.find((group) => group.groupId === 'left') || {}).length ===
          0 && { forceState: 'closed' })}
      >
        <XyAxisSettings
          axis="yLeft"
          layers={state?.layers}
          axisTitle={state?.yTitle}
          updateTitleState={onTitleStateChange}
          areTickLabelsVisible={tickLabelsVisibilitySettings.yLeft}
          toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
          areGridlinesVisible={gridlinesVisibilitySettings.yLeft}
          toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
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
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id="x-axis"
        data-test-subj="x-axis"
        buttonContent={axisConfig('x', isHorizontal).popoverTitle}
        paddingSize="s"
        initialIsOpen
      >
        <XyAxisSettings
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
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id="yRight-axis"
        data-test-subj="yRight-axis"
        buttonContent={
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
            <p>{axisConfig('yRight', isHorizontal).popoverTitle}</p>
          </TooltipWrapper>
        }
        paddingSize="s"
        initialIsOpen
        isDisabled={
          Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length === 0
        }
        {...(Object.keys(axisGroups.find((group) => group.groupId === 'right') || {}).length ===
          0 && { forceState: 'closed' })}
      >
        <XyAxisSettings
          axis="yRight"
          layers={state?.layers}
          axisTitle={state?.yRightTitle}
          updateTitleState={onTitleStateChange}
          areTickLabelsVisible={tickLabelsVisibilitySettings.yRight}
          toggleTickLabelsVisibility={onTickLabelsVisibilitySettingsChange}
          areGridlinesVisible={gridlinesVisibilitySettings.yRight}
          toggleGridlinesVisibility={onGridlinesVisibilitySettingsChange}
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
      </EuiAccordion>
    </>
  );
};
