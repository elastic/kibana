/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Position } from '@elastic/charts';
import {
  EuiButton,
  EuiButtonGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  IconType,
  EuiButtonIcon,
} from '@elastic/eui';
import { State, SeriesType, LayerConfig } from './types';
import { VisualizationProps } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from '../multi_column_editor';
import { generateId } from '../id_generator';

const chartTypeIcons: Array<{ id: SeriesType; label: string; iconType: IconType }> = [
  {
    id: 'line',
    label: i18n.translate('xpack.lens.xyVisualization.lineChartLabel', {
      defaultMessage: 'Line',
    }),
    iconType: 'visLine',
  },
  {
    id: 'area',
    label: i18n.translate('xpack.lens.xyVisualization.areaChartLabel', {
      defaultMessage: 'Area',
    }),
    iconType: 'visArea',
  },
  {
    id: 'bar',
    label: i18n.translate('xpack.lens.xyVisualization.barChartLabel', {
      defaultMessage: 'Bar',
    }),
    iconType: 'visBarVertical',
  },
  {
    id: 'horizontal_bar',
    label: i18n.translate('xpack.lens.xyVisualization.horizontalBarChartLabel', {
      defaultMessage: 'Horizontal Bar',
    }),
    iconType: 'visBarHorizontal',
  },
  {
    id: 'area_stacked',
    label: i18n.translate('xpack.lens.xyVisualization.stackedAreaChartLabel', {
      defaultMessage: 'Stacked Area',
    }),
    iconType: 'visArea',
  },
  {
    id: 'bar_stacked',
    label: i18n.translate('xpack.lens.xyVisualization.stackedBarChartLabel', {
      defaultMessage: 'Stacked Bar',
    }),
    iconType: 'visBarVertical',
  },
  {
    id: 'horizontal_bar_stacked',
    label: i18n.translate('xpack.lens.xyVisualization.stackedHorizontalBarChartLabel', {
      defaultMessage: 'Stacked Horizontal Bar',
    }),
    iconType: 'visBarHorizontal',
  },
];

type UnwrapArray<T> = T extends Array<infer P> ? P : T;

function updateLayer(state: State, layer: UnwrapArray<State['layers']>, index: number): State {
  const newLayers = [...state.layers];
  newLayers[index] = layer;

  return {
    ...state,
    layers: newLayers,
  };
}

function newLayerState(layerId: string): LayerConfig {
  return {
    layerId,
    datasourceId: 'indexpattern', // TODO: Don't hard code
    xAccessor: generateId(),
    seriesType: 'bar_stacked',
    accessors: [generateId()],
    title: '',
    showGridlines: false,
    position: Position.Left,
    labels: [''],
    splitAccessor: generateId(),
  };
}

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, setState, frame } = props;

  return (
    <EuiForm className="lnsConfigPanel">
      {state.layers.map((layer, index) => (
        <EuiFormRow key={layer.layerId}>
          <EuiPanel>
            <EuiFormRow
              label={i18n.translate('xpack.lens.xyChart.layerLabel', {
                defaultMessage: 'Layer',
              })}
            >
              <>
                <EuiButtonIcon
                  iconType="trash"
                  onClick={() => {
                    setState({ ...state, layers: state.layers.filter(l => l !== layer) });
                  }}
                />
                <NativeRenderer
                  data-test-subj="lnsXY_layerHeader"
                  render={props.frame.datasourceLayers[layer.layerId].renderLayerPanel}
                  nativeProps={{ layerId: layer.layerId }}
                />
              </>
            </EuiFormRow>

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
                options={chartTypeIcons}
                idSelected={layer.seriesType}
                onChange={seriesType => {
                  setState(
                    updateLayer(state, { ...layer, seriesType: seriesType as SeriesType }, index)
                  );
                }}
                isIconOnly
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.lens.xyChart.xAxisLabel', {
                defaultMessage: 'X Axis',
              })}
            >
              <NativeRenderer
                data-test-subj="lnsXY_xDimensionPanel"
                render={props.frame.datasourceLayers[layer.layerId].renderDimensionPanel}
                nativeProps={{
                  columnId: layer.xAccessor,
                  dragDropContext: props.dragDropContext,
                  filterOperations: operation => operation.isBucketed,
                  layerId: layer.layerId,
                }}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.lens.xyChart.splitSeries', {
                defaultMessage: 'Split series',
              })}
            >
              <NativeRenderer
                data-test-subj="lnsXY_splitDimensionPanel"
                render={props.frame.datasourceLayers[layer.layerId].renderDimensionPanel}
                nativeProps={{
                  columnId: layer.splitAccessor,
                  dragDropContext: props.dragDropContext,
                  filterOperations: operation => operation.isBucketed,
                  layerId: layer.layerId,
                }}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('xpack.lens.xyChart.yAxisLabel', {
                defaultMessage: 'Y Axis',
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
                filterOperations={op => !op.isBucketed && op.dataType === 'number'}
                testSubj="yDimensionPanel"
                layerId={layer.layerId}
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiFormRow>
      ))}

      <EuiFormRow>
        <EuiButton
          data-test-subj={`lnsXY_layer_add`}
          onClick={() => {
            setState({
              ...state,
              layers: [...state.layers, newLayerState(frame.addNewLayer())],
            });
          }}
          iconType="plusInCircle"
        >
          <FormattedMessage id="xpack.lens.xyChart.addLayerButton" defaultMessage="Add layer" />
        </EuiButton>
      </EuiFormRow>

      <EuiFormRow>
        <EuiButton>
          <FormattedMessage
            id="xpack.lens.xyChart.explainQueryButton"
            defaultMessage="Explain query"
          />
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
}
