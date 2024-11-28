/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiFormRow, IconType } from '@elastic/eui';
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { EuiIconAxisLeft, EuiIconAxisBottom } from '@kbn/chart-icons';
import { TooltipWrapper } from '@kbn/visualization-utils';
import type { VisualizationToolbarProps } from '../../types';
import {
  LegendSettingsPopover,
  ToolbarPopover,
  ValueLabelsSettings,
  ToolbarTitleSettings,
  AxisTicksSettings,
} from '../../shared_components';
import type { HeatmapVisualizationState } from './types';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import './toolbar_component.scss';

const PANEL_STYLE = {
  width: '460px',
};

const legendOptions: Array<{ id: string; value: 'auto' | 'show' | 'hide'; label: string }> = [
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

const axisOrientationOptions: Array<{
  id: string;
  value: 0 | -90 | -45;
  label: string;
}> = [
  {
    id: 'xy_axis_orientation_horizontal',
    value: 0,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
  {
    id: 'xy_axis_orientation_vertical',
    value: -90,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.vertical', {
      defaultMessage: 'Vertical',
    }),
  },
  {
    id: 'xy_axis_orientation_angled',
    value: -45,
    label: i18n.translate('xpack.lens.xyChart.axisOrientation.angled', {
      defaultMessage: 'Angled',
    }),
  },
];

export const HeatmapToolbar = memo(
  (props: VisualizationToolbarProps<HeatmapVisualizationState>) => {
    const { state, setState, frame } = props;

    const legendMode = state.legend.isVisible ? 'show' : 'hide';
    const defaultTruncationValue = getDefaultVisualValuesForLayer(
      state,
      frame.datasourceLayers
    ).truncateText;

    const legendSize = state?.legend.legendSize;

    const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

    const setOrientation = (orientation: 0 | -90 | -45) => {
      setState({
        ...state,
        gridConfig: { ...state.gridConfig, xAxisLabelRotation: orientation },
      });
    }

    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <ToolbarPopover
            title={i18n.translate('xpack.lens.shared.titlesAndTextLabel', {
              defaultMessage: 'Titles and text',
            })}
            type="titlesAndText"
            buttonDataTestSubj="lnsTextOptionsButton"
            data-test-subj="lnsTextOptionsPopover"
            panelStyle={PANEL_STYLE}
          >
            <ValueLabelsSettings
              valueLabels={state?.gridConfig.isCellLabelVisible ? 'show' : 'hide'}
              onValueLabelChange={(newMode) => {
                setState({
                  ...state,
                  gridConfig: { ...state.gridConfig, isCellLabelVisible: newMode === 'show' },
                });
              }}
            />
          </ToolbarPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
            <TooltipWrapper
              tooltipContent={i18n.translate('xpack.lens.heatmap.verticalAxisDisabledHelpText', {
                defaultMessage: 'This setting only applies when vertical axis is enabled.',
              })}
              condition={!Boolean(state?.yAccessor)}
            >
              <ToolbarPopover
                title={i18n.translate('xpack.lens.heatmap.verticalAxisLabel', {
                  defaultMessage: 'Vertical axis',
                })}
                type={EuiIconAxisLeft as IconType}
                groupPosition="left"
                isDisabled={!Boolean(state?.yAccessor)}
                buttonDataTestSubj="lnsHeatmapVerticalAxisButton"
                panelClassName="lnsVisToolbarAxis__popover"
              >
                <ToolbarTitleSettings
                  settingId="yLeft"
                  title={state?.gridConfig.yTitle}
                  updateTitleState={({ title, visible }) => {
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        yTitle: title,
                        isYAxisTitleVisible: visible,
                      },
                    });
                  }}
                  isTitleVisible={state?.gridConfig.isYAxisTitleVisible}
                />
                <AxisTicksSettings
                  axis="yLeft"
                  updateTicksVisibilityState={(visible) => {
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        isYAxisLabelVisible: visible,
                      },
                    });
                  }}
                  isAxisLabelVisible={state?.gridConfig.isYAxisLabelVisible}
                />
              </ToolbarPopover>
            </TooltipWrapper>

            <TooltipWrapper
              tooltipContent={i18n.translate('xpack.lens.heatmap.horizontalAxisDisabledHelpText', {
                defaultMessage: 'This setting only applies when horizontal axis is enabled.',
              })}
              condition={!Boolean(state?.xAccessor)}
            >
              <ToolbarPopover
                title={i18n.translate('xpack.lens.heatmap.horizontalAxisLabel', {
                  defaultMessage: 'Horizontal axis',
                })}
                type={EuiIconAxisBottom as IconType}
                groupPosition="center"
                isDisabled={!Boolean(state?.xAccessor)}
                buttonDataTestSubj="lnsHeatmapHorizontalAxisButton"
              >
                <ToolbarTitleSettings
                  settingId="x"
                  title={state?.gridConfig.xTitle}
                  updateTitleState={({ title, visible }) =>
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        xTitle: title,
                        isXAxisTitleVisible: visible,
                      },
                    })
                  }
                  isTitleVisible={state?.gridConfig.isXAxisTitleVisible}
                />
                <AxisTicksSettings
                  axis="x"
                  updateTicksVisibilityState={(visible) => {
                    setState({
                      ...state,
                      gridConfig: {
                        ...state.gridConfig,
                        isXAxisLabelVisible: visible,
                      },
                    });
                  }}
                  isAxisLabelVisible={state?.gridConfig.isXAxisLabelVisible}
                />
                {/* TODO: Extract component */}
                <EuiFormRow
                  display="columnCompressed"
                  fullWidth
                  label={i18n.translate('xpack.lens.xyChart.axisOrientation.label', {
                    defaultMessage: 'Orientation',
                  })}
                >
                  <EuiButtonGroup
                    isFullWidth
                    legend={i18n.translate('xpack.lens.xyChart.axisOrientation.label', {
                      defaultMessage: 'Orientation',
                    })}
                    data-test-subj="lnsXY_axisOrientation_groups"
                    buttonSize="compressed"
                    options={axisOrientationOptions}
                    idSelected={axisOrientationOptions.find(({ value }) => value === state.gridConfig.xAxisLabelRotation)?.id ?? axisOrientationOptions[0].id}
                    onChange={(optionId) => {
                      const newOrientation = axisOrientationOptions.find(
                        ({ id }) => id === optionId
                      )!.value;
                      setOrientation(newOrientation);
                    }}
                  />
                </EuiFormRow>
              </ToolbarPopover>
            </TooltipWrapper>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LegendSettingsPopover
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
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
