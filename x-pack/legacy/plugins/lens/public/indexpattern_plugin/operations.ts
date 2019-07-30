/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Storage } from 'ui/storage';
import { DataSetup } from '../../../../../../src/legacy/core_plugins/data/public';
import { DimensionPriority, OperationMetadata } from '../types';
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

type PossibleOperationDefinition<
  U extends IndexPatternColumn = IndexPatternColumn
> = U extends IndexPatternColumn ? OperationDefinition<U> : never;

type PossibleOperationDefinitionMapEntyries<
  U extends PossibleOperationDefinition = PossibleOperationDefinition
> = U extends PossibleOperationDefinition ? { [K in U['type']]: U } : never;

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
const operationDefinitions: PossibleOperationDefinition[] = Object.values(operationDefinitionMap);

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
  getPossibleOperationsForDocument: (indexPattern: IndexPattern) => OperationMetadata[];
  getPossibleOperationsForField: (field: IndexPatternField) => OperationMetadata[];
  buildColumn: (arg: {
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

export function getOperationTypesForField(field: IndexPatternField) {
  return operationDefinitions
    .filter(
      operationDefinition => operationDefinition.getPossibleOperationsForField(field).length > 0
    )
    .map(({ type }) => type);
}

type OperationFieldTuple =
  | { type: 'field'; operationType: OperationType; field: string }
  | { operationType: OperationType; type: 'document' };

export function getAvailableOperationsByMetadata(indexPattern: IndexPattern) {
  const operationByMetadata: Record<
    string,
    { operationMetaData: OperationMetadata; operations: OperationFieldTuple[] }
  > = {};

  const addToMap = (operation: OperationFieldTuple) => (operationMetadata: OperationMetadata) => {
    const key = `${operationMetadata.dataType}-${operationMetadata.isBucketed ? 'true' : ''}`;

    if (operationByMetadata[key]) {
      operationByMetadata[key].operations.push(operation);
    } else {
      operationByMetadata[key] = {
        operationMetaData: operationMetadata,
        operations: [operation],
      };
    }
  };

  operationDefinitions.forEach(operationDefinition => {
    operationDefinition
      .getPossibleOperationsForDocument(indexPattern)
      .forEach(addToMap({ type: 'document', operationType: operationDefinition.type }));

    indexPattern.fields.forEach(field => {
      operationDefinition.getPossibleOperationsForField(field).forEach(
        addToMap({
          type: 'field',
          operationType: operationDefinition.type,
          field: field.name,
        })
      );
    });
  });

  return Object.values(operationByMetadata);
}

export function buildColumn({
  op,
  columns,
  field,
  layerId,
  indexPattern,
  suggestedPriority,
  asDocumentOperation,
}: {
  op?: OperationType;
  columns: Partial<Record<string, IndexPatternColumn>>;
  suggestedPriority: DimensionPriority | undefined;
  layerId: string;
  indexPattern: IndexPattern;
  field?: IndexPatternField;
  asDocumentOperation?: boolean;
}): IndexPatternColumn {
  let operationDefinition: PossibleOperationDefinition;

  if (op) {
    operationDefinition = operationDefinitionMap[op];
  } else if (asDocumentOperation) {
    operationDefinition = operationDefinitions.find(
      definition => definition.getPossibleOperationsForDocument(indexPattern).length !== 0
    )!;
  } else if (field) {
    operationDefinition = operationDefinitions.find(
      definition => definition.getPossibleOperationsForField(field).length !== 0
    )!;
  }
  return operationDefinition!.buildColumn({
    columns,
    suggestedPriority,
    field,
    layerId,
    indexPatternId: indexPattern.id,
  });
}
