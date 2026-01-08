/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRange, EuiFlexGroup, EuiFlexItem, EuiText, EuiBadge } from '@elastic/eui';
import type { VisualizationDimensionEditorProps } from '@kbn/lens-common';
import type { GpuChartsVisualizationState } from './types';
import { GROUP_ID, CHART_SHAPES } from './constants';

export function GpuChartsDimensionEditor(
  props: VisualizationDimensionEditorProps<GpuChartsVisualizationState>
) {
  const { state, setState, groupId, accessor } = props;
  const isScatter3d = state.shape === CHART_SHAPES.SCATTER_3D;

  // Color dimension editor
  if (groupId === GROUP_ID.COLOR && accessor === state.colorAccessor) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.lens.gpuCharts.colorPalette', {
              defaultMessage: 'Color palette',
            })}
            display="columnCompressed"
          >
            <EuiText size="s">
              <EuiBadge color="hollow">{state.palette?.name || 'Default (viridis)'}</EuiBadge>
            </EuiText>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Size dimension editor (scatter only)
  if (groupId === GROUP_ID.SIZE && accessor === state.sizeAccessor && isScatter3d) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.lens.gpuCharts.pointSizeRange', {
              defaultMessage: 'Point size range',
            })}
            display="columnCompressed"
          >
            <EuiRange
              min={1}
              max={50}
              step={1}
              value={state.pointSize ?? 5}
              onChange={(e) =>
                setState({
                  ...state,
                  pointSize: Number(e.currentTarget.value),
                })
              }
              showValue
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.lens.gpuCharts.pointOpacity', {
              defaultMessage: 'Point opacity',
            })}
            display="columnCompressed"
          >
            <EuiRange
              min={0.1}
              max={1}
              step={0.1}
              value={state.pointOpacity ?? 0.8}
              onChange={(e) =>
                setState({
                  ...state,
                  pointOpacity: Number(e.currentTarget.value),
                })
              }
              showValue
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Hexagon group dimension editor
  if (groupId === GROUP_ID.GROUP && accessor === state.groupAccessor && !isScatter3d) {
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.lens.gpuCharts.hexagonRadius', {
              defaultMessage: 'Hexagon radius',
            })}
            display="columnCompressed"
          >
            <EuiRange
              min={100}
              max={10000}
              step={100}
              value={state.hexagonRadius ?? 1000}
              onChange={(e) =>
                setState({
                  ...state,
                  hexagonRadius: Number(e.currentTarget.value),
                })
              }
              showValue
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={i18n.translate('xpack.lens.gpuCharts.elevationScale', {
              defaultMessage: 'Elevation scale',
            })}
            display="columnCompressed"
          >
            <EuiRange
              min={0}
              max={10}
              step={0.1}
              value={state.hexagonElevationScale ?? 1}
              onChange={(e) =>
                setState({
                  ...state,
                  hexagonElevationScale: Number(e.currentTarget.value),
                })
              }
              showValue
              compressed
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return null;
}
