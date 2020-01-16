/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { MultiColumnEditor } from '../multi_column_editor';
import {
  SuggestionRequest,
  Visualization,
  VisualizationLayerConfigProps,
  VisualizationSuggestion,
  Operation,
} from '../types';
import { generateId } from '../id_generator';
import chartTableSVG from '../assets/chart_datatable.svg';

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
}: { layer: LayerState } & VisualizationLayerConfigProps<DatatableVisualizationState>) {
  const datasource = frame.datasourceLayers[layer.layerId];

  const originalOrder = datasource.getTableSpec().map(({ columnId }) => columnId);
  // When we add a column it could be empty, and therefore have no order
  const sortedColumns = Array.from(new Set(originalOrder.concat(layer.columns)));

  return (
    <EuiFormRow
      className="lnsConfigPanel__axis"
      label={i18n.translate('xpack.lens.datatable.columns', { defaultMessage: 'Columns' })}
    >
      <MultiColumnEditor
        accessors={sortedColumns}
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
      largeIcon: chartTableSVG,
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Data table',
      }),
    },
  ],

  getLayerIds(state) {
    return state.layers.map(l => l.layerId);
  },

  clearLayer(state) {
    return {
      layers: state.layers.map(l => newLayerState(l.layerId)),
    };
  },

  getDescription() {
    return {
      icon: chartTableSVG,
      label: i18n.translate('xpack.lens.datatable.label', {
        defaultMessage: 'Data table',
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
    keptLayerIds,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    if (
      keptLayerIds.length > 1 ||
      (keptLayerIds.length && table.layerId !== keptLayerIds[0]) ||
      (state && table.changeType === 'unchanged')
    ) {
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
        previewIcon: chartTableSVG,
        // dont show suggestions for reduced versions or single-line tables
        hide: table.changeType === 'reduced' || !table.isMultiRow,
      },
    ];
  },

  renderLayerConfigPanel(domElement, props) {
    const layer = props.state.layers.find(l => l.layerId === props.layerId);

    if (layer) {
      render(
        <I18nProvider>
          <DataTableLayer {...props} layer={layer} />
        </I18nProvider>,
        domElement
      );
    }
  },

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
