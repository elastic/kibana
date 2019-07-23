/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Storage } from 'ui/storage';
import { DataSetup } from '../../../../../../src/legacy/core_plugins/data/public';
import { DimensionPriority, OperationMetaInformation } from '../types';
import {
  IndexPatternColumn,
  IndexPatternField,
  IndexPatternPrivateState,
  OperationType,
  BaseIndexPatternColumn,
  IndexPattern,
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
  getPossibleOperationsForDocument: (indexPattern: IndexPattern) => OperationMetaInformation[];
  getPossibleOperationsForField: (field: IndexPatternField) => OperationMetaInformation[];
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

export interface OperationMapping {
      operationMeta: OperationMetaInformation;
      applicableFields: string[];
      applicableWithoutField: boolean;
      applicableOperationTypes: OperationType[];
}

export function getOperationTypesForField(field: IndexPatternField) {
  return operationDefinitions.filter(operationDefinition => operationDefinition.getPossibleOperationsForField(field).length > 0).map(({ type }) => type);
}

export function getPotentialOperations(indexPattern: IndexPattern) {
  const operations: Map<
    string,
    OperationMapping
  > = new Map();
  operationDefinitions.forEach(operationDefinition => {
    operationDefinition.getPossibleOperationsForDocument(indexPattern).forEach(operationMeta => {
      const key = JSON.stringify(operationMeta);
      const currentOperation = operations.get(key);

      operations.set(key, {
        operationMeta,
        applicableFields: currentOperation ? currentOperation.applicableFields : [],
        applicableWithoutField: true,
        applicableOperationTypes: [
          ...(currentOperation
            ? currentOperation.applicableOperationTypes.filter(
                type => type !== operationDefinition.type
              )
            : []),
          operationDefinition.type,
        ],
      });
    });
    indexPattern.fields.forEach(field => {
      operationDefinition.getPossibleOperationsForField(field).forEach(operationMeta => {
        const key = JSON.stringify(operationMeta);
        const currentOperation = operations.get(key);

        operations.set(key, {
          operationMeta,
          applicableFields: [
            ...(currentOperation
              ? currentOperation.applicableFields.filter(
                  applicableField => applicableField !== field.name
                )
              : []),
            field.name,
          ],
          applicableWithoutField: currentOperation
            ? currentOperation.applicableWithoutField
            : false,
          applicableOperationTypes: [
            ...(currentOperation
              ? currentOperation.applicableOperationTypes.filter(
                  type => type !== operationDefinition.type
                )
              : []),
            operationDefinition.type,
          ],
        });
      });
    });
  });
  // todo there has to be an order to that
  return Array.from(operations.values());
}

export function buildColumnForField<T extends OperationType>({
  index,
  columns,
  field,
  layerId,
  indexPatternId,
  suggestedPriority,
}: {
  index: number;
  field: IndexPatternField;
  columns: Partial<Record<string, IndexPatternColumn>>;
  suggestedPriority: DimensionPriority | undefined;
  layerId: string;
  indexPatternId: string;
}): IndexPatternColumn {
  const operationDefinition = operationDefinitions.find(
    definition => definition.getPossibleOperationsForField(field).length !== 0
  )!;
  return buildColumnForOperationType({
    index,
    op: operationDefinition.type,
    columns,
    field,
    layerId,
    indexPatternId,
    suggestedPriority,
  });
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
