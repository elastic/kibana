/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { DatasourceDimensionProps, IndexPatternMap, OperationMetadata } from '../../../types';
import { OperationType } from '../form_based';
import { memoizedGetAvailableOperationsByMetadata, OperationFieldTuple } from '../operations';
import { FormBasedPrivateState } from '../types';

export interface OperationSupportMatrix {
  operationByField: Map<string, Set<OperationType>>;
  operationWithoutField: Set<OperationType>;
  fieldByOperation: Map<OperationType, Set<string>>;
}

type Props = Pick<
  DatasourceDimensionProps<FormBasedPrivateState>,
  'layerId' | 'columnId' | 'filterOperations'
> & {
  state: FormBasedPrivateState;
  indexPatterns: IndexPatternMap;
};

function computeOperationMatrix(
  operationsByMetadata: Array<{
    operationMetaData: OperationMetadata;
    operations: OperationFieldTuple[];
  }>,
  filterOperations: (operation: OperationMetadata) => boolean
): OperationSupportMatrix {
  return operationsByMetadata
    .reduce<OperationFieldTuple[]>((opsFieldTuples, { operationMetaData, operations }) => {
      return filterOperations(operationMetaData)
        ? [...opsFieldTuples, ...operations]
        : opsFieldTuples;
    }, [])
    .reduce<OperationSupportMatrix>(
      (matrix, operation) => {
        if (operation.type === 'field') {
          const fieldOps = matrix.operationByField.get(operation.field) ?? new Set<OperationType>();
          fieldOps.add(operation.operationType);
          matrix.operationByField.set(operation.field, fieldOps);
          const opFields =
            matrix.fieldByOperation.get(operation.operationType) ?? new Set<string>();
          opFields.add(operation.field);
          matrix.fieldByOperation.set(operation.operationType, opFields);
        } else {
          matrix.operationWithoutField.add(operation.operationType);
        }
        return matrix;
      },
      { operationByField: new Map(), operationWithoutField: new Set(), fieldByOperation: new Map() }
    );
}

// memoize based on latest execution. It supports multiple args
const memoizedComputeOperationsMatrix = memoizeOne(computeOperationMatrix);

// TODO: the support matrix should be available outside of the dimension panel
export const getOperationSupportMatrix = (props: Props): OperationSupportMatrix => {
  const layerId = props.layerId;
  const currentIndexPattern = props.indexPatterns[props.state.layers[layerId].indexPatternId];

  const operationsByMetadata = memoizedGetAvailableOperationsByMetadata(currentIndexPattern);
  return memoizedComputeOperationsMatrix(operationsByMetadata, props.filterOperations);
};
