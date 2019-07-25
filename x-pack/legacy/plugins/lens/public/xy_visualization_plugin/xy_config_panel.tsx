/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  IconType,
  EuiButtonIcon,
  EuiIcon,
  EuiSwitch,
} from '@elastic/eui';
import { State, SeriesType, LayerConfig } from './types';
import { VisualizationProps } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from '../multi_column_editor';
import { generateId } from '../id_generator';

export const chartTypeIcons: Array<{ id: SeriesType; label: string; iconType: IconType }> = [
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
    xAccessor: generateId(),
    seriesType: 'bar_stacked',
    accessors: [generateId()],
    title: '',
    splitAccessor: generateId(),
  };
}

interface LocalState {
  isChartOptionsOpen: boolean;
  openLayerId: string | null;
}

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, setState, frame } = props;

  const [localState, setLocalState] = useState({
    isChartOptionsOpen: false,
    openLayerId: null,
  } as LocalState);

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiFormRow>
        <EuiPopover
          id="lnsXY_chartConfig"
          isOpen={localState.isChartOptionsOpen}
          closePopover={() => {
            setLocalState({ ...localState, isChartOptionsOpen: false });
          }}
          button={
            <EuiFormRow>
              <>
                <EuiButton
                  iconType="gear"
                  size="s"
                  data-test-subj="lnsXY_chart_settings"
                  onClick={() => {
                    setLocalState({ ...localState, isChartOptionsOpen: true });
                  }}
                >
                  <FormattedMessage
                    id="xpack.lens.xyChart.chartSettings"
                    defaultMessage="Chart Settings"
                  />
                </EuiButton>
              </>
            </EuiFormRow>
          }
        >
          <>
            <EuiFormRow>
              <EuiSwitch
                label={i18n.translate('xpack.lens.xyChart.isHorizontalSwitch', {
                  defaultMessage: 'Rotate chart 90º',
                })}
                checked={state.isHorizontal}
                onChange={() => {
                  setState({
                    ...state,
                    isHorizontal: !state.isHorizontal,
                  });
                }}
                data-test-subj="lnsXY_chart_horizontal"
              />
            </EuiFormRow>
          </>
        </EuiPopover>
      </EuiFormRow>

      {state.layers.map((layer, index) => (
        <EuiFormRow key={layer.layerId} data-test-subj={`lnsXY_layer_${layer.layerId}`}>
          <EuiPanel>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiPopover
                  id="lnsXY_layer"
                  isOpen={localState.openLayerId === layer.layerId}
                  closePopover={() => {
                    setLocalState({ ...localState, openLayerId: null });
                  }}
                  button={
                    <EuiButtonIcon
                      iconType="gear"
                      data-test-subj="lnsXY_layer_advanced"
                      aria-label={i18n.translate('xpack.lens.xyChart.layerSettings', {
                        defaultMessage: 'Edit layer settings',
                      })}
                      onClick={() => {
                        setLocalState({ ...localState, openLayerId: layer.layerId });
                      }}
                    />
                  }
                >
                  <>
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
                            updateLayer(
                              state,
                              { ...layer, seriesType: seriesType as SeriesType },
                              index
                            )
                          );
                        }}
                        isIconOnly
                      />
                    </EuiFormRow>

                    <EuiButton
                      iconType="trash"
                      color="danger"
                      size="s"
                      data-test-subj="lnsXY_layer_remove"
                      onClick={() => {
                        frame.removeLayer(layer.layerId);
                        setState({ ...state, layers: state.layers.filter(l => l !== layer) });
                      }}
                    >
                      <FormattedMessage
                        id="xpack.lens.xyChart.removeLayer"
                        defaultMessage="Remove Layer"
                      />
                    </EuiButton>
                  </>
                </EuiPopover>
              </EuiFlexItem>

              <EuiFlexItem>
                <EuiIcon
                  type={chartTypeIcons.find(icon => icon.id === layer.seriesType)!.iconType}
                />
              </EuiFlexItem>

              <EuiFlexItem>
                <NativeRenderer
                  data-test-subj="lnsXY_layerHeader"
                  render={props.frame.datasourceLayers[layer.layerId].renderLayerPanel}
                  nativeProps={{ layerId: layer.layerId }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

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
                  suggestedPriority: 1,
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
                  suggestedPriority: 0,
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
                data-test-subj="lensXY_yDimensionPanel"
                testSubj="lensXY_yDimensionPanel"
                layerId={layer.layerId}
              />
            </EuiFormRow>
          </EuiPanel>
        </EuiFormRow>
      ))}

      <EuiFormRow>
        <EuiButton
          size="s"
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
    </EuiForm>
  );
}
