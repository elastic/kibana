/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiForm, EuiFormRow, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { MultiColumnEditor } from '../multi_column_editor';
import {
  SuggestionRequest,
  Visualization,
  VisualizationProps,
  VisualizationSuggestion,
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
    <EuiPanel className="lnsConfigPanel">
      <>
        <NativeRenderer
          render={datasource.renderLayerPanel}
          nativeProps={{ layerId: layer.layerId }}
        />
        <EuiFormRow
          label={i18n.translate('xpack.lens.datatable.columns', { defaultMessage: 'Columns' })}
        >
          <MultiColumnEditor
            accessors={layer.columns}
            datasource={datasource}
            dragDropContext={dragDropContext}
            filterOperations={allOperations}
            layerId={layer.layerId}
            onAdd={() =>
              setState(updateColumns(state, layer, columns => [...columns, generateId()]))
            }
            onRemove={column =>
              setState(updateColumns(state, layer, columns => columns.filter(c => c !== column)))
            }
            testSubj="datatable_columns"
            data-test-subj="datatable_multicolumnEditor"
          />
        </EuiFormRow>
      </>
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
      icon: 'empty',
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Datatable',
      }),
    };
  },

  switchVisualizationType: (_, state) => state,

  initialize(frame, state) {
    const layerId = Object.keys(frame.datasourceLayers)[0] || frame.addNewLayer();
    return (
      state || {
        layers: [newLayerState(layerId)],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions({
    tables,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    const maxColumnCount = Math.max.apply(undefined, tables.map(table => table.columns.length));
    return tables.map(table => {
      const title = i18n.translate('xpack.lens.datatable.visualizationOf', {
        defaultMessage: 'Table: {operations}',
        values: {
          operations: table.columns.map(col => col.operation.label).join(' & '),
        },
      });

      return {
        title,
        // largest possible table will have a score of 0.2, less columns reduce score
        score: (table.columns.length / maxColumnCount) * 0.2,
        datasourceSuggestionId: table.datasourceSuggestionId,
        state: {
          layers: [
            {
              layerId: table.layerId,
              columns: table.columns.map(col => col.columnId),
            },
          ],
        },
        previewIcon: 'visTable',
      };
    });
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
      .filter(o => o.operation);

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
                          o.operation!.label ||
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
