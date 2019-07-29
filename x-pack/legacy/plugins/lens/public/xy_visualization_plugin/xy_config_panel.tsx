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
  EuiButtonIcon,
  EuiPopover,
  EuiSwitch,
} from '@elastic/eui';
import { State, SeriesType, LayerConfig, visualizationTypes } from './types';
import { VisualizationProps, OperationMetadata } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from '../multi_column_editor';
import { generateId } from '../id_generator';

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

function newLayerState(seriesType: SeriesType, layerId: string): LayerConfig {
  return {
    layerId,
    seriesType,
    xAccessor: generateId(),
    accessors: [generateId()],
    title: '',
    splitAccessor: generateId(),
  };
}

function LayerSettings({
  layer,
  setSeriesType,
  removeLayer,
}: {
  layer: LayerConfig;
  setSeriesType: (seriesType: SeriesType) => void;
  removeLayer: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { icon } = visualizationTypes.find(c => c.id === layer.seriesType)!;

  return (
    <EuiPopover
      id={`lnsXYSeriesTypePopover_${layer.layerId}`}
      ownFocus
      button={
        <EuiButtonIcon
          iconType={icon || 'lnsBarVertical'}
          aria-label={i18n.translate('xpack.lens.xyChart.layerSettings', {
            defaultMessage: 'Edit layer settings',
          })}
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="lnsXY_layer_advanced"
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="leftUp"
    >
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
          options={visualizationTypes.map(t => ({
            ...t,
            iconType: t.icon || 'empty',
          }))}
          idSelected={layer.seriesType}
          onChange={seriesType => setSeriesType(seriesType as SeriesType)}
          isIconOnly
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiButton
          iconType="trash"
          color="danger"
          data-test-subj="lnsXY_layer_remove"
          onClick={removeLayer}
        >
          {i18n.translate('xpack.lens.xyChart.removeLayer', {
            defaultMessage: 'Remove layer',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiPopover>
  );
}

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, setState, frame } = props;
  const [isChartOptionsOpen, setIsChartOptionsOpen] = useState(false);

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiFormRow>
        <EuiPopover
          id="lnsXY_chartConfig"
          isOpen={isChartOptionsOpen}
          closePopover={() => setIsChartOptionsOpen(false)}
          button={
            <EuiFormRow>
              <>
                <EuiButton
                  iconType="gear"
                  size="s"
                  data-test-subj="lnsXY_chart_settings"
                  onClick={() => setIsChartOptionsOpen(true)}
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
                <EuiFormRow>
                  <LayerSettings
                    layer={layer}
                    setSeriesType={seriesType =>
                      setState(updateLayer(state, { ...layer, seriesType }, index))
                    }
                    removeLayer={() => {
                      frame.removeLayer(layer.layerId);
                      setState({ ...state, layers: state.layers.filter(l => l !== layer) });
                    }}
                  />
                </EuiFormRow>
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
                  filterOperations: isBucketed,
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
                  filterOperations: isBucketed,
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
                filterOperations={isNumericMetric}
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
              layers: [
                ...state.layers,
                newLayerState(state.preferredSeriesType, frame.addNewLayer()),
              ],
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
