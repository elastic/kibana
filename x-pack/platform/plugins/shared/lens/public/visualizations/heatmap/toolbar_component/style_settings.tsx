/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { VisualizationToolbarProps } from '@kbn/lens-common';
import type { FramePublicAPI } from '@kbn/lens-common';
import { EuiAccordion, EuiHorizontalRule, EuiFormRow, EuiSelect } from '@elastic/eui';
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

const sortOptions = [
  {
    value: '',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    value: 'asc',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.ascending', {
      defaultMessage: 'Ascending',
    }),
  },
  {
    value: 'desc',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.descending', {
      defaultMessage: 'Descending',
    }),
  },
  {
    value: 'dataIndex',
    text: i18n.translate('xpack.lens.heatmap.sortOrder.original', {
      defaultMessage: 'Query order',
    }),
  },
];

// Convert current predicate to display value for the select
function getDisplayValue(predicate: string | undefined): string {
  if (!predicate) return '';
  if (predicate === 'dataIndex') return 'dataIndex';
  if (predicate === 'numAsc' || predicate === 'alphaAsc') return 'asc';
  if (predicate === 'numDesc' || predicate === 'alphaDesc') return 'desc';
  return '';
}

/**
 * Determines the appropriate sort predicate based on column data type and sort direction
 */
function getSortPredicateForColumn(
  accessor: string | undefined,
  direction: 'asc' | 'desc',
  layerId: string | undefined,
  frame: FramePublicAPI
): HeatmapGridConfig['xSortPredicate'] {
  if (!accessor || !layerId || !frame.activeData?.[layerId]) {
    // Fallback to alphabetical if we can't determine the type
    return direction === 'asc' ? 'alphaAsc' : 'alphaDesc';
  }

  const table = frame.activeData[layerId];
  const column = table.columns.find((col) => col.id === accessor);

  if (!column) {
    // Fallback to alphabetical if column not found
    return direction === 'asc' ? 'alphaAsc' : 'alphaDesc';
  }

  // Check if column is numeric based on meta.type
  const isNumeric = column.meta?.type === 'number';

  if (direction === 'asc') {
    return isNumeric ? 'numAsc' : 'alphaAsc';
  } else {
    return isNumeric ? 'numDesc' : 'alphaDesc';
  }
}

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
  frame,
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
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.heatmap.sortOrder.label', {
          defaultMessage: 'Sort order',
        })}
        fullWidth
      >
        <EuiSelect
          compressed
          data-test-subj="lnsHeatmapYAxisSortOrder"
          options={sortOptions}
          value={getDisplayValue(state?.gridConfig.ySortPredicate)}
          onChange={(e) => {
            const selectedValue = e.target.value;
            let predicate: HeatmapGridConfig['ySortPredicate'];

            if (selectedValue === '') {
              predicate = undefined; // Auto
            } else if (selectedValue === 'dataIndex') {
              predicate = 'dataIndex';
            } else {
              // For "Ascending" or "Descending", detect column type
              const direction = selectedValue === 'asc' ? 'asc' : 'desc';
              predicate = getSortPredicateForColumn(
                state?.yAccessor,
                direction,
                state?.layerId,
                frame
              );
            }

            setState({
              ...state,
              gridConfig: {
                ...state.gridConfig,
                ySortPredicate: predicate,
              },
            });
          }}
        />
      </EuiFormRow>
    </>
  );
}

export function HeatmapHorizontalAxisSettings({
  state,
  setState,
  frame,
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
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.heatmap.sortOrder.label', {
          defaultMessage: 'Sort order',
        })}
        fullWidth
      >
        <EuiSelect
          compressed
          data-test-subj="lnsHeatmapXAxisSortOrder"
          options={sortOptions}
          value={getDisplayValue(state?.gridConfig.xSortPredicate)}
          onChange={(e) => {
            const selectedValue = e.target.value;
            let predicate:
              | 'numAsc'
              | 'numDesc'
              | 'alphaAsc'
              | 'alphaDesc'
              | 'dataIndex'
              | undefined;

            if (selectedValue === '') {
              predicate = undefined; // Auto
            } else if (selectedValue === 'dataIndex') {
              predicate = 'dataIndex';
            } else {
              // For "Ascending" or "Descending", detect column type
              const direction = selectedValue === 'asc' ? 'asc' : 'desc';
              predicate = getSortPredicateForColumn(
                state?.xAccessor,
                direction,
                state?.layerId,
                frame
              );
            }

            setState({
              ...state,
              gridConfig: {
                ...state.gridConfig,
                xSortPredicate: predicate,
              },
            });
          }}
        />
      </EuiFormRow>
    </>
  );
}
