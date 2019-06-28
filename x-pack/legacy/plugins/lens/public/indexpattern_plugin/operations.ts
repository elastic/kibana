/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DimensionPriority } from '../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  OperationType,
  BaseIndexPatternColumn,
} from './indexpattern';
import { termsOperation } from './operation_definitions/terms';
import {
  minOperation,
  averageOperation,
  sumOperation,
  maxOperation,
} from './operation_definitions/metrics';
import { dateHistogramOperation } from './operation_definitions/date_histogram';
import { countOperation } from './operation_definitions/count';
import { sortByField } from './state_helpers';

type PossibleOperationDefinitions<
  U extends IndexPatternColumn = IndexPatternColumn
> = U extends IndexPatternColumn ? OperationDefinition<U> : never;

type PossibleOperationDefinitionMapEntyries<
  U extends PossibleOperationDefinitions = PossibleOperationDefinitions
> = U extends PossibleOperationDefinitions ? { [K in U['type']]: U } : never;

type UnionToIntersection<U> = (U extends U ? (k: U) => void : never) extends ((k: infer I) => void)
  ? I
  : never;

// this type makes sure that there is an operation definition for each column type
export type AllOperationDefinitions = UnionToIntersection<PossibleOperationDefinitionMapEntyries>;

export const operationDefinitionMap: AllOperationDefinitions = {
  terms: termsOperation,
  date_histogram: dateHistogramOperation,
  min: minOperation,
  max: maxOperation,
  avg: averageOperation,
  sum: sumOperation,
  count: countOperation,
};
const operationDefinitions: PossibleOperationDefinitions[] = Object.values(operationDefinitionMap);

export function getOperations(): OperationType[] {
  return Object.keys(operationDefinitionMap) as OperationType[];
}

export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  columnId: string;
}

export interface OperationDefinition<C extends BaseIndexPatternColumn> {
  type: C['operationType'];
  displayName: string;
  // TODO make this a function dependend on the indexpattern with typeMeta information
  isApplicableWithoutField: boolean;
  isApplicableForField: (field: IndexPatternField) => boolean;
  buildColumn: (
    operationId: string,
    suggestedOrder?: DimensionPriority,
    field?: IndexPatternField
  ) => C;
  paramEditor?: React.ComponentType<ParamEditorProps>;
  toEsAggsConfig: (column: C, columnId: string) => unknown;
}

export function getOperationDisplay() {
  const display = {} as Record<
    OperationType,
    {
      type: OperationType;
      displayName: string;
    }
  >;
  operationDefinitions.forEach(({ type, displayName }) => {
    display[type] = {
      type,
      displayName,
    };
  });
  return display;
}

export function getOperationTypesForField(field: IndexPatternField): OperationType[] {
  return operationDefinitions
    .filter(definition => definition.isApplicableForField(field))
    .map(({ type }) => type);
}

export function buildColumnForOperationType<T extends OperationType>(
  index: number,
  op: T,
  suggestedOrder?: DimensionPriority,
  field?: IndexPatternField
): IndexPatternColumn {
  return operationDefinitionMap[op].buildColumn(`${index}${op}`, suggestedOrder, field);
}

export function getPotentialColumns(
  state: IndexPatternPrivateState,
  suggestedOrder?: DimensionPriority
): IndexPatternColumn[] {
  const fields = state.indexPatterns[state.currentIndexPatternId].fields;

  const columns: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(op =>
        buildColumnForOperationType(index, op, suggestedOrder, field)
      );
    })
    .reduce((prev, current) => prev.concat(current));

  operationDefinitions.forEach(operation => {
    if (operation.isApplicableWithoutField) {
      columns.push(operation.buildColumn(operation.type, suggestedOrder));
    }
  });

  return sortByField(columns);
}
