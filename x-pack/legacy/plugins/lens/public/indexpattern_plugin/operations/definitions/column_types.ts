/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Operation, DimensionPriority } from '../../../types';

/**
 * This is the root type of a column. If you are implementing a new
 * operation, extend your column type on `BaseIndexPatternColumn` to make
 * sure it's matching all the basic requirements.
 */
export interface BaseIndexPatternColumn extends Operation {
  // Private
  operationType: string;
  suggestedPriority?: DimensionPriority;
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;
export type ParameterlessIndexPatternColumn<
  TOperationType extends string,
  TBase extends BaseIndexPatternColumn = FieldBasedIndexPatternColumn
> = Omit<TBase, 'operationType'> & { operationType: TOperationType };

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  sourceField: string;
  suggestedPriority?: DimensionPriority;
}
