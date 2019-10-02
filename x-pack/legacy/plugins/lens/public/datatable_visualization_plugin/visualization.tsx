/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiForm, EuiFormRow, EuiPanel, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { MultiColumnEditor } from '../multi_column_editor';
import {
  SuggestionRequest,
  Visualization,
  VisualizationProps,
  VisualizationSuggestion,
  Operation,
} from '../types';
import { generateId } from '../id_generator';
import { NativeRenderer } from '../native_renderer';

export interface LayerState {
  layerId: string;
  columns: string[];
}

export interface DatatableVisualizationState {
  layers: LayerState[];
}

function newLayerState(layerId: string): LayerState {
  return {
    layerId,
    columns: [generateId()],
  };
}

function updateColumns(
  state: DatatableVisualizationState,
  layer: LayerState,
  fn: (columns: string[]) => string[]
) {
  const columns = fn(layer.columns);
  const updatedLayer = { ...layer, columns };
  const layers = state.layers.map(l => (l.layerId === layer.layerId ? updatedLayer : l));
  return { ...state, layers };
}

const allOperations = () => true;

export function DataTableLayer({
  layer,
  frame,
  state,
  setState,
  dragDropContext,
}: { layer: LayerState } & VisualizationProps<DatatableVisualizationState>) {
  const datasource = frame.datasourceLayers[layer.layerId];
  return (
    <EuiPanel className="lnsConfigPanel__panel" paddingSize="s">
      <NativeRenderer
        render={datasource.renderLayerPanel}
        nativeProps={{ layerId: layer.layerId }}
      />

      <EuiSpacer size="s" />
      <EuiFormRow
        className="lnsConfigPanel__axis"
        label={i18n.translate('xpack.lens.datatable.columns', { defaultMessage: 'Columns' })}
      >
        <MultiColumnEditor
          accessors={layer.columns}
          datasource={datasource}
          dragDropContext={dragDropContext}
          filterOperations={allOperations}
          layerId={layer.layerId}
          onAdd={() => setState(updateColumns(state, layer, columns => [...columns, generateId()]))}
          onRemove={column =>
            setState(updateColumns(state, layer, columns => columns.filter(c => c !== column)))
          }
          testSubj="datatable_columns"
          data-test-subj="datatable_multicolumnEditor"
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

export const datatableVisualization: Visualization<
  DatatableVisualizationState,
  DatatableVisualizationState
> = {
  id: 'lnsDatatable',

  visualizationTypes: [
    {
      id: 'lnsDatatable',
      icon: 'visTable',
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Datatable',
      }),
    },
  ],

  getDescription(state) {
    return {
      icon: 'visTable',
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Datatable',
      }),
    };
  },

  switchVisualizationType: (_, state) => state,

  initialize(frame, state) {
    return (
      state || {
        layers: [newLayerState(frame.addNewLayer())],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions({
    table,
    state,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    if (state && table.changeType === 'unchanged') {
      return [];
    }
    const title =
      table.changeType === 'unchanged'
        ? i18n.translate('xpack.lens.datatable.suggestionLabel', {
            defaultMessage: 'As table',
          })
        : i18n.translate('xpack.lens.datatable.visualizationOf', {
            defaultMessage: 'Table {operations}',
            values: {
              operations:
                table.label ||
                table.columns
                  .map(col => col.operation.label)
                  .join(
                    i18n.translate('xpack.lens.datatable.conjunctionSign', {
                      defaultMessage: ' & ',
                      description:
                        'A character that can be used for conjunction of multiple enumarated items. Make sure to include spaces around it if needed.',
                    })
                  ),
            },
          });

    return [
      {
        title,
        // table with >= 10 columns will have a score of 0.6, fewer columns reduce score
        score: (Math.min(table.columns.length, 10) / 10) * 0.6,
        state: {
          layers: [
            {
              layerId: table.layerId,
              columns: table.columns.map(col => col.columnId),
            },
          ],
        },
        previewIcon: 'visTable',
        // dont show suggestions for reduced versions or single-line tables
        hide: table.changeType === 'reduced' || !table.isMultiRow,
      },
    ];
  },

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <EuiForm className="lnsConfigPanel">
          {props.state.layers.map(layer => (
            <DataTableLayer key={layer.layerId} layer={layer} {...props} />
          ))}
        </EuiForm>
      </I18nProvider>,
      domElement
    ),

  toExpression(state, frame) {
    const layer = state.layers[0];
    const datasource = frame.datasourceLayers[layer.layerId];
    const operations = layer.columns
      .map(columnId => ({ columnId, operation: datasource.getOperationForColumnId(columnId) }))
      .filter((o): o is { columnId: string; operation: Operation } => !!o.operation);

    return {
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'lens_datatable',
          arguments: {
            columns: [
              {
                type: 'expression',
                chain: [
                  {
                    type: 'function',
                    function: 'lens_datatable_columns',
                    arguments: {
                      columnIds: operations.map(o => o.columnId),
                      labels: operations.map(
                        o =>
                          o.operation.label ||
                          i18n.translate('xpack.lens.datatable.na', {
                            defaultMessage: 'N/A',
                          })
                      ),
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  },
};
