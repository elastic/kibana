/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { State, SeriesType, visualizationTypes } from './types';
import { VisualizationLayerConfigProps, OperationMetadata } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from '../multi_column_editor';
import { generateId } from '../id_generator';
import { isHorizontalChart, isHorizontalSeries } from './state_helpers';
import { trackUiEvent } from '../lens_ui_telemetry';

const isNumericMetric = (op: OperationMetadata) => !op.isBucketed && op.dataType === 'number';
const isBucketed = (op: OperationMetadata) => op.isBucketed;

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

export function LayerContextMenu(props: VisualizationLayerConfigProps<State>) {
  const { state, layerId } = props;
  const horizontalOnly = isHorizontalChart(state.layers);
  const index = state.layers.findIndex(l => l.layerId === layerId);
  const layer = state.layers[index];

  if (!layer) {
    return null;
  }

  return (
    <EuiFormRow
      label={i18n.translate('xpack.lens.xyChart.chartTypeLabel', {
        defaultMessage: 'Chart type',
      })}
    >
      <EuiButtonGroup
        legend={i18n.translate('xpack.lens.xyChart.chartTypeLegend', {
          defaultMessage: 'Chart type',
        })}
        name="chartType"
        className="eui-displayInlineBlock"
        data-test-subj="lnsXY_seriesType"
        options={visualizationTypes
          .filter(t => isHorizontalSeries(t.id as SeriesType) === horizontalOnly)
          .map(t => ({
            id: t.id,
            label: t.label,
            iconType: t.icon || 'empty',
          }))}
        idSelected={layer.seriesType}
        onChange={seriesType => {
          trackUiEvent('xy_change_layer_display');
          props.setState(
            updateLayer(state, { ...layer, seriesType: seriesType as SeriesType }, index)
          );
        }}
        isIconOnly
        buttonSize="compressed"
      />
    </EuiFormRow>
  );
}

export function XYConfigPanel(props: VisualizationLayerConfigProps<State>) {
  const { state, setState, frame, layerId } = props;
  const index = props.state.layers.findIndex(l => l.layerId === layerId);

  if (index < 0) {
    return null;
  }

  const layer = props.state.layers[index];

  return (
    <>
      <EuiFormRow
        className="lnsConfigPanel__axis"
        label={i18n.translate('xpack.lens.xyChart.xAxisLabel', {
          defaultMessage: 'X-axis',
        })}
      >
        <NativeRenderer
          data-test-subj="lnsXY_xDimensionPanel"
          render={props.frame.datasourceLayers[layer.layerId].renderDimensionPanel}
          nativeProps={{
            columnId: layer.xAccessor,
            dragDropContext: props.dragDropContext,
            filterOperations: isBucketed,
            suggestedPriority: 1,
            layerId: layer.layerId,
            hideGrouping: true,
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        className="lnsConfigPanel__axis"
        data-test-subj="lnsXY_yDimensionPanel"
        label={i18n.translate('xpack.lens.xyChart.yAxisLabel', {
          defaultMessage: 'Y-axis',
        })}
      >
        <MultiColumnEditor
          accessors={layer.accessors}
          datasource={frame.datasourceLayers[layer.layerId]}
          dragDropContext={props.dragDropContext}
          onAdd={() =>
            setState(
              updateLayer(
                state,
                {
                  ...layer,
                  accessors: [...layer.accessors, generateId()],
                },
                index
              )
            )
          }
          onRemove={accessor =>
            setState(
              updateLayer(
                state,
                {
                  ...layer,
                  accessors: layer.accessors.filter(col => col !== accessor),
                },
                index
              )
            )
          }
          filterOperations={isNumericMetric}
          data-test-subj="lensXY_yDimensionPanel"
          testSubj="lensXY_yDimensionPanel"
          layerId={layer.layerId}
        />
      </EuiFormRow>
      <EuiFormRow
        className="lnsConfigPanel__axis"
        label={i18n.translate('xpack.lens.xyChart.splitSeries', {
          defaultMessage: 'Break down by',
        })}
      >
        <NativeRenderer
          data-test-subj="lnsXY_splitDimensionPanel"
          render={props.frame.datasourceLayers[layer.layerId].renderDimensionPanel}
          nativeProps={{
            columnId: layer.splitAccessor,
            dragDropContext: props.dragDropContext,
            filterOperations: isBucketed,
            suggestedPriority: 0,
            layerId: layer.layerId,
          }}
        />
      </EuiFormRow>
    </>
  );
}
