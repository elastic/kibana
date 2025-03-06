/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericOperationDefinition } from '../..';
import type { GenericIndexPatternColumn } from '../../column_types';
import { getFilter } from '../../helpers';

interface PartialColumnParams {
  kql?: string;
  lucene?: string;
  shift?: string;
  reducedTimeRange?: string;
}

type OperationByInputType<Input extends GenericOperationDefinition['input']> = Extract<
  GenericOperationDefinition,
  { input: Input }
>;

export function createOperationDefinitionMock<T extends GenericIndexPatternColumn>(
  operation: string,
  {
    input = 'field',
    getErrorMessage,
    buildColumn,
    ...params
  }: Partial<GenericOperationDefinition<T>> = {},
  {
    label = operation,
    dataType = 'number',
    isBucketed = false,
    scale = 'ratio',
    timeScale,
  }: Partial<GenericIndexPatternColumn> = {}
): OperationByInputType<typeof input> {
  const sharedColumnParams = {
    label,
    dataType,
    operationType: operation,
    isBucketed,
    scale,
    timeScale,
  };
  const sharedDefinitionParams = {
    input,
    getDefaultLabel: jest.fn(),
    isTransferable: jest.fn(),
    displayName: label,
    type: operation,
    getErrorMessage: getErrorMessage ?? jest.fn(),
    toExpression: jest.fn(),
  };
  if (input === 'field') {
    return {
      buildColumn:
        buildColumn ??
        jest.fn(({ field }, columnParams: PartialColumnParams) => ({
          sourceField: field.name,
          filter: getFilter(undefined, columnParams),
          reducedTimeRange: columnParams.reducedTimeRange,
          ...sharedColumnParams,
        })),
      onFieldChange: jest.fn(),
      toEsAggsFn: jest.fn(),
      getPossibleOperationForField:
        (params as OperationByInputType<typeof input>).getPossibleOperationForField ??
        jest.fn((arg) => ({
          scale,
          dataType,
          isBucketed,
        })),
      ...sharedDefinitionParams,
      ...params,
    } as OperationByInputType<typeof input>;
  }
  if (input === 'fullReference') {
    return {
      buildColumn:
        buildColumn ??
        jest.fn(({ referenceIds }, columnParams: PartialColumnParams | undefined) => ({
          references: referenceIds,
          filter: getFilter(undefined, columnParams),
          ...sharedColumnParams,
        })),
      getPossibleOperation: jest.fn(() => ({
        scale: 'ratio',
        dataType: 'number',
        isBucketed: false,
      })),
      requiredReferences: [
        {
          input: ['field', 'managedReference'],
          validateMetadata: jest.fn(),
        },
      ],
      selectionStyle: 'field',
      ...sharedDefinitionParams,
      ...params,
    } as OperationByInputType<typeof input>;
  }
  return {
    buildColumn:
      buildColumn ??
      jest.fn((_, columnsParams: PartialColumnParams) => ({
        references: [],
        filter: getFilter(undefined, columnsParams),
        ...sharedColumnParams,
      })),
    getPossibleOperation: jest.fn(),
    createCopy: jest.fn(),
    ...sharedDefinitionParams,
    ...params,
  } as OperationByInputType<typeof input>;
}
