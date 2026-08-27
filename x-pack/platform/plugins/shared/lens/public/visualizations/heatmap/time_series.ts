/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OperationMetadata } from '@kbn/lens-common';

type OperationLike = Pick<OperationMetadata, 'dataType' | 'scale'>;

export const isTimeSeriesOperation = (operation?: OperationLike | null): boolean =>
  operation?.dataType === 'date' && operation?.scale === 'interval';

/**
 * Returns true if the axis is time based, either by the operation or the column type (query result type).
 */
export function isTimeBasedAxis(operation?: OperationLike | null, actualColumnType?: string) {
  return actualColumnType === 'date' || isTimeSeriesOperation(operation);
}
