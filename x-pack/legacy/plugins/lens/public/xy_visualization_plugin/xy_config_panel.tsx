/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Position } from '@elastic/charts';
import {
  EuiButton,
  EuiButtonGroup,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiButtonIcon,
  EuiPopover,
} from '@elastic/eui';
import { State, SeriesType, LayerConfig, visualizationTypes } from './types';
import { VisualizationProps } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from '../multi_column_editor';
import { generateId } from '../id_generator';

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
    showGridlines: false,
    position: Position.Left,
    splitAccessor: generateId(),
  };
}

function LayerSeriesTypeConfig({
  layer,
  setSeriesType,
  removeLayer,
}: {
  layer: LayerConfig;
  setSeriesType: (seriesType: SeriesType) => void;
  removeLayer: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { icon, label } = visualizationTypes.find(c => c.id === layer.seriesType)!;

  return (
    <EuiPopover
      id={`lnsXYSeriesTypePopover_${layer.layerId}`}
      ownFocus
      button={
        <EuiButtonIcon
          iconType={icon || 'empty'}
          aria-label={label}
          onClick={() => setIsOpen(!isOpen)}
          data-test-subj="lnsXYSeriesTypePopover"
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
        <EuiButton iconType="trash" data-test-subj="lnsXY_layer_remove" onClick={removeLayer}>
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
                <LayerSeriesTypeConfig
                  layer={layer}
                  setSeriesType={seriesType =>
                    setState(updateLayer(state, { ...layer, seriesType }, index))
                  }
                  removeLayer={() => {
                    frame.removeLayer(layer.layerId);
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
