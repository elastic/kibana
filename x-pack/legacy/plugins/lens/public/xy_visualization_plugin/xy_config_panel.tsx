/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiSpacer,
  EuiButtonEmpty,
  EuiPopoverFooter,
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
      panelPaddingSize="s"
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
            id: t.id,
            label: t.label,
            iconType: t.icon || 'empty',
          }))}
          idSelected={layer.seriesType}
          onChange={seriesType => setSeriesType(seriesType as SeriesType)}
          isIconOnly
          buttonSize="compressed"
        />
      </EuiFormRow>
      <EuiPopoverFooter className="eui-textCenter">
        <EuiButtonEmpty
          size="xs"
          iconType="trash"
          color="danger"
          data-test-subj="lnsXY_layer_remove"
          onClick={removeLayer}
        >
          {i18n.translate('xpack.lens.xyChart.deleteLayer', {
            defaultMessage: 'Delete layer',
          })}
        </EuiButtonEmpty>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, setState, frame } = props;
  const [isChartOptionsOpen, setIsChartOptionsOpen] = useState(false);

  return (
    <EuiForm className="lnsConfigPanel">
      <EuiPopover
        id="lnsXY_chartConfig"
        isOpen={isChartOptionsOpen}
        closePopover={() => setIsChartOptionsOpen(false)}
        button={
          <EuiButtonIcon
            iconType="gear"
            size="s"
            data-test-subj="lnsXY_chart_settings"
            onClick={() => setIsChartOptionsOpen(!isChartOptionsOpen)}
            aria-label={i18n.translate('xpack.lens.xyChart.chartSettings', {
              defaultMessage: 'Chart Settings',
            })}
            title={i18n.translate('xpack.lens.xyChart.chartSettings', {
              defaultMessage: 'Chart Settings',
            })}
          />
        }
      >
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
      </EuiPopover>

      {state.layers.map((layer, index) => (
        <EuiPanel
          className="lnsConfigPanel__panel"
          key={layer.layerId}
          data-test-subj={`lnsXY_layer_${layer.layerId}`}
          paddingSize="s"
        >
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false}>
              <LayerSettings
                layer={layer}
                setSeriesType={seriesType =>
                  setState(updateLayer(state, { ...layer, seriesType }, index))
                }
                removeLayer={() => {
                  frame.removeLayers([layer.layerId]);
                  setState({ ...state, layers: state.layers.filter(l => l !== layer) });
                }}
              />
            </EuiFlexItem>

            <EuiFlexItem className="eui-textTruncate">
              <NativeRenderer
                data-test-subj="lnsXY_layerHeader"
                render={props.frame.datasourceLayers[layer.layerId].renderLayerPanel}
                nativeProps={{ layerId: layer.layerId }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xs" />

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
        </EuiPanel>
      ))}

      <EuiButton
        className="lnsConfigPanel__addLayerBtn"
        fullWidth
        size="s"
        data-test-subj={`lnsXY_layer_add`}
        aria-label={i18n.translate('xpack.lens.xyChart.addLayerButton', {
          defaultMessage: 'Add layer',
        })}
        title={i18n.translate('xpack.lens.xyChart.addLayerButton', {
          defaultMessage: 'Add layer',
        })}
        onClick={() => {
          const usedSeriesTypes = _.uniq(state.layers.map(layer => layer.seriesType));
          setState({
            ...state,
            layers: [
              ...state.layers,
              newLayerState(
                usedSeriesTypes.length === 1 ? usedSeriesTypes[0] : state.preferredSeriesType,
                frame.addNewLayer()
              ),
            ],
          });
        }}
        iconType="plusInCircleFilled"
      />
    </EuiForm>
  );
}
