/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LegendSize } from '@kbn/chart-expressions-common';
import { EuiIconAxisLeft, EuiIconAxisBottom } from '@kbn/chart-icons';
import { TooltipWrapper } from '@kbn/visualization-utils';
import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { LegendSettingsPopover, ToolbarPopover } from '../../../shared_components';

import type { HeatmapVisualizationState } from '../types';
import { getDefaultVisualValuesForLayer } from '../../../shared_components/datasource_default_values';
import {
  HeatmapHorizontalAxisSettings,
  HeatmapTitlesAndTextSettings,
  HeatmapVerticalAxisSettings,
} from './style_settings';
import { legendOptions } from './legend_settings';

/**
 * TODO: Remove this file after migration to flyout toolbar
 * See: https://github.com/elastic/kibana/issues/240088
 */

const PANEL_STYLE = {
  width: '500px',
};

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
            <HeatmapTitlesAndTextSettings {...props} />
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
                panelStyle={PANEL_STYLE}
              >
                <HeatmapVerticalAxisSettings {...props} />
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
                panelStyle={PANEL_STYLE}
              >
                <HeatmapHorizontalAxisSettings {...props} />
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
