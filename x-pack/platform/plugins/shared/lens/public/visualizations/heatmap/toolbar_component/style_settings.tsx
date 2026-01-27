/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { VisualizationToolbarProps } from '@kbn/lens-common';
import { EuiAccordion, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ValueLabelsSettings,
  ToolbarTitleSettings,
  AxisTicksSettings,
  AxisLabelOrientationSelector,
  allowedOrientations,
} from '../../../shared_components';
import type { Orientation } from '../../../shared_components';
import type { HeatmapVisualizationState } from '../types';

export function HeatmapStyleSettings(props: VisualizationToolbarProps<HeatmapVisualizationState>) {
  return (
    <>
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.titlesAndText', {
          defaultMessage: 'Titles and text',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapTitlesAndTextSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.verticalAxis', {
          defaultMessage: 'Vertical axis',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapVerticalAxisSettings {...props} />
      </EuiAccordion>
      <EuiHorizontalRule margin="m" />
      <EuiAccordion
        id={''}
        buttonContent={i18n.translate('xpack.lens.visualization.toolbar.horizontalAxis', {
          defaultMessage: 'Horizontal axis',
        })}
        paddingSize="s"
        initialIsOpen
      >
        <HeatmapHorizontalAxisSettings {...props} />
      </EuiAccordion>
    </>
  );
}

export function HeatmapTitlesAndTextSettings({
  state,
  setState,
}: VisualizationToolbarProps<HeatmapVisualizationState>) {
  return (
    <ValueLabelsSettings
      valueLabels={state?.gridConfig.isCellLabelVisible ? 'show' : 'hide'}
      onValueLabelChange={(newMode) => {
        setState({
          ...state,
          gridConfig: { ...state.gridConfig, isCellLabelVisible: newMode === 'show' },
        });
      }}
    />
  );
}

export function HeatmapVerticalAxisSettings({
  state,
  setState,
}: VisualizationToolbarProps<HeatmapVisualizationState>) {
  return (
    <>
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
    </>
  );
}

export function HeatmapHorizontalAxisSettings({
  state,
  setState,
}: VisualizationToolbarProps<HeatmapVisualizationState>) {
  const isXAxisLabelVisible = state?.gridConfig.isXAxisLabelVisible;

  return (
    <>
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
        isAxisLabelVisible={isXAxisLabelVisible}
      />

      {isXAxisLabelVisible && (
        <AxisLabelOrientationSelector
          axis="x"
          selectedLabelOrientation={
            allowedOrientations.includes(state.gridConfig.xAxisLabelRotation as Orientation)
              ? (state.gridConfig.xAxisLabelRotation as Orientation)
              : 0 // Default to 0 if the value is not valid
          }
          setLabelOrientation={(orientation) => {
            setState({
              ...state,
              gridConfig: { ...state.gridConfig, xAxisLabelRotation: orientation },
            });
          }}
        />
      )}
    </>
  );
}
