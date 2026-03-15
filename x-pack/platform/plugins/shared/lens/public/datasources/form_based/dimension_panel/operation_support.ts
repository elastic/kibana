/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import type {
  DatasourceDimensionProps,
  IndexPatternMap,
  OperationMetadata,
  FormBasedPrivateState,
} from '@kbn/lens-common';
import type { OperationType } from '../form_based';
import type { OperationFieldTuple } from '../operations';
import { memoizedGetAvailableOperationsByMetadata } from '../operations';

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

/**
 * Returns the single value from a Set if it has exactly one element, otherwise undefined.
 * Useful when auto-selecting the only available option.
 */
export function getSingleValue<T>(set: Set<T> | undefined): T | undefined {
  if (!set || set.size !== 1) return undefined;
  return set.values().next().value as T;
}

/**
 * Returns the first value from a non-empty Set, or undefined if the Set is empty/undefined.
 * Useful as a fallback when any available option will do.
 */
export function getFirstValue<T>(set: Set<T> | undefined): T | undefined {
  if (!set || set.size === 0) return undefined;
  return set.values().next().value as T;
}
