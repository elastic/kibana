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
  sourceField: string;
  suggestedPriority?: DimensionPriority;
}

/**
 * Base type for a column that doesn't have additional parameter.
 *
 * * `TOperationType` should be a string type containing just the type
 *   of the operation (e.g. `"sum"`).
 * * `TBase` is the base column interface the operation type is set for -
 *   by default this is `FieldBasedIndexPatternColumn`, so
 *   `ParameterlessIndexPatternColumn<'foo'>` will give you a column type
 *   for an operation named foo that operates on a field.
 *   By passing in another `TBase` (e.g. just `BaseIndexPatternColumn`),
 *   you can also create other column types.
 */
export type ParameterlessIndexPatternColumn<
  TOperationType extends string,
  TBase extends BaseIndexPatternColumn = FieldBasedIndexPatternColumn
> = TBase & { operationType: TOperationType };

export interface FieldBasedIndexPatternColumn extends BaseIndexPatternColumn {
  suggestedPriority?: DimensionPriority;
}
