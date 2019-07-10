/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { Position } from '@elastic/charts';
import {
  EuiFieldText,
  EuiButtonGroup,
  EuiForm,
  EuiFormRow,
  EuiSwitch,
  IconType,
} from '@elastic/eui';
import { State, SeriesType } from './types';
import { VisualizationProps } from '../types';
import { NativeRenderer } from '../native_renderer';
import { MultiColumnEditor } from './multi_column_editor';

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

const positionIcons = [
  {
    id: Position.Left,
    label: 'Left',
    iconType: 'arrowLeft',
  },
  {
    id: Position.Top,
    label: 'Top',
    iconType: 'arrowUp',
  },
  {
    id: Position.Bottom,
    label: 'Bottom',
    iconType: 'arrowDown',
  },
  {
    id: Position.Right,
    label: 'Right',
    iconType: 'arrowRight',
  },
];

export function XYConfigPanel(props: VisualizationProps<State>) {
  const { state, datasource, setState } = props;

  return (
    <EuiForm className="lnsConfigPanel">
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
          options={chartTypeIcons.map(type =>
            type.id.includes('stacked') && state.splitSeriesAccessors.length === 0
              ? { ...type, isDisabled: true }
              : type
          )}
          idSelected={state.seriesType}
          onChange={seriesType => {
            const isHorizontal = seriesType === 'horizontal_bar';
            setState({
              ...state,
              seriesType: seriesType as SeriesType,
              x: {
                ...state.x,
                position: isHorizontal ? Position.Left : Position.Bottom,
              },
              y: {
                ...state.y,
                position: isHorizontal ? Position.Bottom : Position.Left,
              },
            });
          }}
          isIconOnly
        />
      </EuiFormRow>

      <EuiFormRow>
        <EuiSwitch
          label={i18n.translate('xpack.lens.xyChart.showLegendLabel', {
            defaultMessage: 'Show legend',
          })}
          checked={state.legend.isVisible}
          data-test-subj="lnsXY_legendIsVisible"
          onChange={() =>
            setState({
              ...state,
              legend: { ...state.legend, isVisible: !state.legend.isVisible },
            })
          }
        />
      </EuiFormRow>

      {state.legend.isVisible && (
        <EuiFormRow
          label={i18n.translate('xpack.lens.xyChart.legendPositionLabel', {
            defaultMessage: 'Legend position',
          })}
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.lens.xyChart.legendPositionButtonLabel', {
              defaultMessage: 'Legend position',
            })}
            data-test-subj="lnsXY_legendPosition"
            name="legendPosition"
            options={positionIcons}
            idSelected={state.legend.position}
            onChange={position =>
              setState({ ...state, legend: { ...state.legend, position: position as Position } })
            }
            isIconOnly
          />
        </EuiFormRow>
      )}

      <EuiFormRow
        label={i18n.translate('xpack.lens.xyChart.splitSeries', {
          defaultMessage: 'Split series',
        })}
      >
        <MultiColumnEditor
          accessors={state.splitSeriesAccessors}
          datasource={datasource}
          dragDropContext={props.dragDropContext}
          onAdd={accessor =>
            setState({ ...state, splitSeriesAccessors: [...state.splitSeriesAccessors, accessor] })
          }
          onRemove={accessor =>
            setState({
              ...state,
              splitSeriesAccessors: state.splitSeriesAccessors.filter(col => col !== accessor),
            })
          }
          filterOperations={op => op.isBucketed && op.dataType !== 'date'}
          suggestedPriority={0}
          testSubj="splitSeriesDimensionPanel"
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.lens.xyChart.xAxisLabel', {
          defaultMessage: 'X Axis',
        })}
      >
        <>
          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.xTitleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate('xpack.lens.xyChart.xTitlePlaceholder', {
                defaultMessage: 'Title',
              })}
              data-test-subj="lnsXY_xTitle"
              value={state.x.title}
              onChange={e => setState({ ...state, x: { ...state.x, title: e.target.value } })}
              aria-label={i18n.translate('xpack.lens.xyChart.xTitleAriaLabel', {
                defaultMessage: 'Title',
              })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.xValueLabel', {
              defaultMessage: 'Value',
            })}
          >
            <NativeRenderer
              data-test-subj="lnsXY_xDimensionPanel"
              render={datasource.renderDimensionPanel}
              nativeProps={{
                columnId: state.x.accessor,
                dragDropContext: props.dragDropContext,
                // TODO: Filter out invalid x-dimension operations
                filterOperations: () => true,
              }}
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.lens.xyChart.xShowGridlinesLabel', {
                defaultMessage: 'Show gridlines',
              })}
              data-test-subj="lnsXY_xShowGridlines"
              checked={state.x.showGridlines}
              onChange={() =>
                setState({ ...state, x: { ...state.x, showGridlines: !state.x.showGridlines } })
              }
            />
          </EuiFormRow>
        </>
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.lens.xyChart.yAxisLabel', {
          defaultMessage: 'Y Axis',
        })}
      >
        <>
          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.yTitleLabel', {
              defaultMessage: 'Title',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate('xpack.lens.xyChart.yTitlePlaceholder', {
                defaultMessage: 'Title',
              })}
              data-test-subj="lnsXY_yTitle"
              value={state.y.title}
              onChange={e => setState({ ...state, y: { ...state.y, title: e.target.value } })}
              aria-label={i18n.translate('xpack.lens.xyChart.yTitleAriaLabel', {
                defaultMessage: 'Title',
              })}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.lens.xyChart.yValueLabel', {
              defaultMessage: 'Value',
            })}
          >
            <MultiColumnEditor
              accessors={state.y.accessors}
              datasource={datasource}
              dragDropContext={props.dragDropContext}
              onAdd={accessor =>
                setState({
                  ...state,
                  y: {
                    ...state.y,
                    accessors: [...state.y.accessors, accessor],
                  },
                })
              }
              onRemove={accessor =>
                setState({
                  ...state,
                  y: {
                    ...state.y,
                    accessors: state.y.accessors.filter(col => col !== accessor),
                  },
                })
              }
              filterOperations={op => !op.isBucketed && op.dataType === 'number'}
              testSubj="yDimensionPanel"
            />
          </EuiFormRow>

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('xpack.lens.xyChart.yShowGridlinesLabel', {
                defaultMessage: 'Show gridlines',
              })}
              data-test-subj="lnsXY_yShowGridlines"
              checked={state.y.showGridlines}
              onChange={() =>
                setState({ ...state, y: { ...state.y, showGridlines: !state.y.showGridlines } })
              }
            />
          </EuiFormRow>
        </>
      </EuiFormRow>
    </EuiForm>
  );
}
