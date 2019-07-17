/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from 'ui/storage';
import { DataSetup } from '../../../../../../src/legacy/core_plugins/data/public';
import { DimensionPriority } from '../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  IndexPatternLayer,
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
import { filterRatioOperation } from './operation_definitions/filter_ratio';
import { sortByField } from './utils';

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
  filter_ratio: filterRatioOperation,
};
const operationDefinitions: PossibleOperationDefinitions[] = Object.values(operationDefinitionMap);

export function getOperations(): OperationType[] {
  return Object.keys(operationDefinitionMap) as OperationType[];
}

export interface ParamEditorProps {
  state: IndexPatternPrivateState;
  setState: (newState: IndexPatternPrivateState) => void;
  columnId: string;
  layerId: string;
  dataPlugin?: DataSetup;
  storage?: Storage;
}

export interface OperationDefinition<C extends BaseIndexPatternColumn> {
  type: C['operationType'];
  displayName: string;
  // TODO make this a function dependend on the indexpattern with typeMeta information
  isApplicableWithoutField: boolean;
  isApplicableForField: (field: IndexPatternField) => boolean;
  buildColumn: (arg: {
    operationId: string;
    suggestedPriority: DimensionPriority | undefined;
    layerId: string;
    indexPatternId: string;
    columns: Partial<Record<string, IndexPatternColumn>>;
    field?: IndexPatternField;
  }) => C;
  onOtherColumnChanged?: (
    currentColumn: C,
    columns: Partial<Record<string, IndexPatternColumn>>
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

export function buildColumnForOperationType<T extends OperationType>({
  index,
  op,
  columns,
  field,
  layerId,
  indexPatternId,
  suggestedPriority,
}: {
  index: number;
  op: T;
  columns: Partial<Record<string, IndexPatternColumn>>;
  suggestedPriority: DimensionPriority | undefined;
  layerId: string;
  indexPatternId: string;
  field?: IndexPatternField;
}): IndexPatternColumn {
  return operationDefinitionMap[op].buildColumn({
    operationId: `${index}${op}`,
    columns,
    suggestedPriority,
    field,
    layerId,
    indexPatternId,
  });
}

export function getPotentialColumns({
  // state,
  // suggestedPriority,
  fields,
  suggestedPriority,
  layerId,
  layer,
}: {
  fields: IndexPatternField[];
  // state: IndexPatternPrivateState;
  suggestedPriority?: DimensionPriority;
  layerId: string;
  layer: IndexPatternLayer;
}): IndexPatternColumn[] {
  // const result: IndexPatternColumn[] = fields
  // const indexPattern = state.layers[layerId].indexPatternId;

  // const fields = state.indexPatterns[indexPattern].fields;

  // const columns: IndexPatternColumn[] = fields
  // =======
  // export function getPotentialColumns(
  //   fields: IndexPatternField[],
  //   suggestedOrder?: DimensionPriority
  // ): IndexPatternColumn[] {
  // const result: IndexPatternColumn[] = fields
  // >>>>>>> origin/feature/lens
  const result: IndexPatternColumn[] = fields
    .map((field, index) => {
      const validOperations = getOperationTypesForField(field);

      return validOperations.map(
        op =>
          buildColumnForOperationType({
            index,
            op,
            columns: layer.columns,
            suggestedPriority,
            field,
            indexPatternId: layer.indexPatternId,
            layerId,
          })
        // buildColumnForOperationType(index, op, {}, suggestedOrder, field)
      );
    })
    .reduce((prev, current) => prev.concat(current));

  operationDefinitions.forEach(operation => {
    if (operation.isApplicableWithoutField) {
      // columns.push(
      result.push(
        operation.buildColumn({
          operationId: operation.type,
          suggestedPriority,
          layerId,
          columns: layer.columns,
          indexPatternId: layer.indexPatternId,
        })
      );
      // result.push(operation.buildColumn(operation.type, {}, suggestedOrder));
    }
  });

  return sortByField(result);
}
