/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render } from 'react-dom';
import { Chrome } from 'ui/chrome';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import uuid from 'uuid';
import {
  DatasourceDimensionPanelProps,
  DatasourceDataPanelProps,
  DimensionPriority,
  DatasourceSuggestion,
} from '../types';
import { getIndexPatterns } from './loader';
import { toExpression } from './to_expression';
import { IndexPatternDimensionPanel } from './dimension_panel';
import { buildColumnForOperationType, getOperationTypesForField } from './operations';
import { Datasource, DataType } from '..';

export type OperationType = IndexPatternColumn['operationType'];

export type IndexPatternColumn =
  | DateHistogramIndexPatternColumn
  | TermsIndexPatternColumn
  | SumIndexPatternColumn
  | AvgIndexPatternColumn
  | MinIndexPatternColumn
  | MaxIndexPatternColumn
  | CountIndexPatternColumn;

export interface BaseIndexPatternColumn {
  // Public
  operationId: string;
  label: string;
  dataType: DataType;
  isBucketed: boolean;

  // Private
  operationType: OperationType;
  suggestedOrder?: DimensionPriority;
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
type ParameterlessIndexPatternColumn<
  TOperationType extends OperationType,
  TBase extends BaseIndexPatternColumn = FieldBasedIndexPatternColumn
> = Omit<TBase, 'operationType'> & { operationType: TOperationType };

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
  suggestedOrder?: DimensionPriority;
}

export interface DateHistogramIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'date_histogram';
  params: {
    interval: string;
    timeZone?: string;
  };
}

export interface TermsIndexPatternColumn extends FieldBasedIndexPatternColumn {
  operationType: 'terms';
  params: {
    size: number;
    orderBy: { type: 'alphabetical' } | { type: 'column'; columnId: string };
  };
}

export type CountIndexPatternColumn = ParameterlessIndexPatternColumn<
  'count',
  BaseIndexPatternColumn
>;
export type SumIndexPatternColumn = ParameterlessIndexPatternColumn<'sum'>;
export type AvgIndexPatternColumn = ParameterlessIndexPatternColumn<'avg'>;
export type MinIndexPatternColumn = ParameterlessIndexPatternColumn<'min'>;
export type MaxIndexPatternColumn = ParameterlessIndexPatternColumn<'max'>;

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  title: string;
  timeFieldName?: string | null;
}

export interface IndexPatternField {
  name: string;
  type: string;
  esTypes?: string[];
  aggregatable: boolean;
  searchable: boolean;
  aggregationRestrictions?: Partial<
    Record<
      string,
      {
        agg: string;
        interval?: number;
        fixed_interval?: string;
        calendar_interval?: string;
        delay?: string;
        time_zone?: string;
      }
    >
  >;
}

export interface IndexPatternPersistedState {
  currentIndexPatternId: string;

  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatterns: Record<string, IndexPattern>;
};

export function columnToOperation(column: IndexPatternColumn) {
  const { dataType, label, isBucketed, operationId } = column;
  return {
    id: operationId,
    label,
    dataType,
    isBucketed,
  };
}

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T;
type InferFromArray<T> = T extends Array<infer P> ? P : T;

function addRestrictionsToFields(
  indexPattern: InferFromArray<Exclude<UnwrapPromise<ReturnType<typeof getIndexPatterns>>, void>>
): IndexPattern {
  const { typeMeta } = indexPattern;
  if (!typeMeta) {
    return indexPattern;
  }

  const aggs = Object.keys(typeMeta.aggs);

  const newFields = [...(indexPattern.fields as IndexPatternField[])];
  newFields.forEach((field, index) => {
    const restrictionsObj: IndexPatternField['aggregationRestrictions'] = {};
    aggs.forEach(agg => {
      if (typeMeta.aggs[agg] && typeMeta.aggs[agg][field.name]) {
        restrictionsObj[agg] = typeMeta.aggs[agg][field.name];
      }
    });
    if (Object.keys(restrictionsObj).length) {
      newFields[index] = { ...field, aggregationRestrictions: restrictionsObj };
    }
  });

  const { id, title, timeFieldName } = indexPattern;

  return {
    id,
    title,
    timeFieldName: timeFieldName || undefined,
    fields: newFields,
  };
}

export function getIndexPatternDatasource(chrome: Chrome, toastNotifications: ToastNotifications) {
  // Not stateful. State is persisted to the frame
  const indexPatternDatasource: Datasource<IndexPatternPrivateState, IndexPatternPersistedState> = {
    async initialize(state?: IndexPatternPersistedState) {
      const indexPatternObjects = await getIndexPatterns(chrome, toastNotifications);
      const indexPatterns: Record<string, IndexPattern> = {};

      if (indexPatternObjects) {
        indexPatternObjects.forEach(obj => {
          indexPatterns[obj.id] = addRestrictionsToFields(obj);
        });
      }

      if (state) {
        return {
          ...state,
          indexPatterns,
        };
      }
      return {
        currentIndexPatternId: indexPatternObjects ? indexPatternObjects[0].id : '',
        indexPatterns,
        columns: {},
        columnOrder: [],
      };
    },

    getPersistableState({ currentIndexPatternId, columns, columnOrder }: IndexPatternPrivateState) {
      return { currentIndexPatternId, columns, columnOrder };
    },

    toExpression,

    renderDataPanel(
      domElement: Element,
      props: DatasourceDataPanelProps<IndexPatternPrivateState>
    ) {
      render(
        <I18nProvider>
          <IndexPatternDataPanel {...props} />
        </I18nProvider>,
        domElement
      );
    },

    getPublicAPI(state, setState) {
      return {
        getTableSpec: () => {
          return state.columnOrder.map(colId => ({ columnId: colId }));
        },
        getOperationForColumnId: (columnId: string) => {
          if (!state.columns[columnId]) {
            return null;
          }
          return columnToOperation(state.columns[columnId]);
        },
        generateColumnId: () => {
          // TODO: Come up with a more compact form of generating unique column ids
          return uuid.v4();
        },

        renderDimensionPanel: (domElement: Element, props: DatasourceDimensionPanelProps) => {
          render(
            <IndexPatternDimensionPanel
              state={state}
              setState={newState => setState(newState)}
              {...props}
            />,
            domElement
          );
        },

        removeColumnInTableSpec: (columnId: string) => [],
        moveColumnTo: (columnId: string, targetIndex: number) => {},
        duplicateColumn: (columnId: string) => [],
      };
    },

    getDatasourceSuggestionsForField(
      state,
      item
    ): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
      const field: IndexPatternField = item as IndexPatternField;

      if (Object.keys(state.columns).length) {
        // Not sure how to suggest multiple fields yet
        return [];
      }

      const operations = getOperationTypesForField(field);
      const hasBucket = operations.find(op => op === 'date_histogram' || op === 'terms');

      if (hasBucket) {
        const column = buildColumnForOperationType(0, hasBucket, undefined, field);

        const countColumn = buildColumnForOperationType(1, 'count');

        const suggestion: DatasourceSuggestion<IndexPatternPrivateState> = {
          state: {
            ...state,
            columns: {
              col1: column,
              col2: countColumn,
            },
            columnOrder: ['col1', 'col2'],
          },

          table: {
            columns: [
              {
                columnId: 'col1',
                operation: columnToOperation(column),
              },
              {
                columnId: 'col2',
                operation: columnToOperation(countColumn),
              },
            ],
            isMultiRow: true,
            datasourceSuggestionId: 0,
          },
        };

        return [suggestion];
      } else if (state.indexPatterns[state.currentIndexPatternId].timeFieldName) {
        const currentIndexPattern = state.indexPatterns[state.currentIndexPatternId];
        const dateField = currentIndexPattern.fields.find(
          f => f.name === currentIndexPattern.timeFieldName
        )!;

        const column = buildColumnForOperationType(0, operations[0], undefined, field);

        const dateColumn = buildColumnForOperationType(1, 'date_histogram', undefined, dateField);

        const suggestion: DatasourceSuggestion<IndexPatternPrivateState> = {
          state: {
            ...state,
            columns: {
              col1: dateColumn,
              col2: column,
            },
            columnOrder: ['col1', 'col2'],
          },

          table: {
            columns: [
              {
                columnId: 'col1',
                operation: columnToOperation(column),
              },
              {
                columnId: 'col2',
                operation: columnToOperation(dateColumn),
              },
            ],
            isMultiRow: true,
            datasourceSuggestionId: 0,
          },
        };

        return [suggestion];
      }

      return [];
    },

    getDatasourceSuggestionsFromCurrentState(
      state
    ): Array<DatasourceSuggestion<IndexPatternPrivateState>> {
      if (!state.columnOrder.length) {
        return [];
      }
      return [
        {
          state,

          table: {
            columns: state.columnOrder.map(id => ({
              columnId: id,
              operation: columnToOperation(state.columns[id]),
            })),
            isMultiRow: true,
            datasourceSuggestionId: 0,
          },
        },
      ];
    },
  };

  return indexPatternDatasource;
}
