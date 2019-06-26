/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import {
  EuiButtonIcon,
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import {
  SuggestionRequest,
  Visualization,
  VisualizationProps,
  VisualizationSuggestion,
} from '../types';
import { NativeRenderer } from '../native_renderer';

export interface DatatableVisualizationState {
  columns: Array<{
    id: string;
    label: string;
  }>;
}

export function DatatableConfigPanel(props: VisualizationProps<DatatableVisualizationState>) {
  const { state, datasource, setState } = props;

  return (
    <EuiForm className="lnsConfigPanel">
      {state.columns.map(({ id, label }, index) => {
        const operation = datasource.getOperationForColumnId(id);
        return (
          <>
            <EuiFormRow
              key={id}
              label={i18n.translate('xpack.lens.datatable.columnLabel', {
                defaultMessage: 'Column',
              })}
            >
              <EuiFieldText
                data-test-subj="lnsDatatable-columnLabel"
                value={label || ''}
                onChange={e => {
                  const newColumns = [...state.columns];
                  newColumns[index] = { ...newColumns[index], label: e.target.value };
                  setState({
                    ...state,
                    columns: newColumns,
                  });
                }}
                placeholder={
                  operation
                    ? operation.label
                    : i18n.translate('xpack.lens.datatable.columnTitlePlaceholder', {
                        defaultMessage: 'Title',
                      })
                }
                aria-label={i18n.translate('xpack.lens.datatable.columnTitlePlaceholder', {
                  defaultMessage: 'Title',
                })}
              />
            </EuiFormRow>

            <EuiFormRow>
              <EuiFlexGroup>
                <EuiFlexItem grow={true}>
                  <NativeRenderer
                    data-test-subj="lnsDatatable_dimensionPanel"
                    render={datasource.renderDimensionPanel}
                    nativeProps={{
                      columnId: id,
                      dragDropContext: props.dragDropContext,
                      filterOperations: () => true,
                    }}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    size="s"
                    color="warning"
                    data-test-subj={`lnsDatatable_dimensionPanelRemove_${id}`}
                    iconType="trash"
                    onClick={() => {
                      datasource.removeColumnInTableSpec(id);
                      const newColumns = [...state.columns];
                      newColumns.splice(index, 1);
                      setState({
                        ...state,
                        columns: newColumns,
                      });
                    }}
                    aria-label={i18n.translate('xpack.lens.datatable.removeColumnAriaLabel', {
                      defaultMessage: 'Remove',
                    })}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </>
        );
      })}

      <div>
        <EuiButton
          data-test-subj="lnsDatatable_dimensionPanel_add"
          onClick={() => {
            const newColumns = [...state.columns];
            newColumns.push({
              id: datasource.generateColumnId(),
              label: '',
            });
            setState({
              ...state,
              columns: newColumns,
            });
          }}
          iconType="plusInCircle"
        />
      </div>
    </EuiForm>
  );
}

export const datatableVisualization: Visualization<
  DatatableVisualizationState,
  DatatableVisualizationState
> = {
  initialize(datasource, state) {
    return (
      state || {
        columns: [
          {
            id: datasource.generateColumnId(),
            label: '',
          },
        ],
      }
    );
  },

  getPersistableState: state => state,

  getSuggestions({
    tables,
  }: SuggestionRequest<DatatableVisualizationState>): Array<
    VisualizationSuggestion<DatatableVisualizationState>
  > {
    return tables.map(table => {
      const title = i18n.translate('xpack.lens.datatable.visualizationOf', {
        defaultMessage: 'Table: {operations}',
        values: {
          operations: table.columns.map(col => col.operation.label).join(' & '),
        },
      });

      return {
        title,
        score: 1,
        datasourceSuggestionId: table.datasourceSuggestionId,
        state: {
          columns: table.columns.map(col => ({
            id: col.columnId,
            label: col.operation.label,
          })),
        },
        previewIcon: 'visTable',
      };
    });
  },

  renderConfigPanel: (domElement, props) =>
    render(
      <I18nProvider>
        <DatatableConfigPanel {...props} />
      </I18nProvider>,
      domElement
    ),

  toExpression: (state, datasource) => ({
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
                    columnIds: state.columns.map(({ id }) => id),
                    labels: state.columns.map(({ id, label }) => {
                      if (label) {
                        return label;
                      }
                      const operation = datasource.getOperationForColumnId(id);
                      return operation ? operation.label : '';
                    }),
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  }),
};
