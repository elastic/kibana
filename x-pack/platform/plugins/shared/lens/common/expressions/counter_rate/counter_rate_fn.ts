/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildResultColumns, getBucketIdentifier } from '@kbn/expressions-plugin/common';
import type { CounterRateExpressionFunction } from './types';

export const counterRateFn: CounterRateExpressionFunction['fn'] = (
  input,
  { by, inputColumnId, outputColumnId, outputColumnName }
) => {
  const resultColumns = buildResultColumns(input, outputColumnId, inputColumnId, outputColumnName);

  if (!resultColumns) {
    return input;
  }
  const previousValues: Partial<Record<string, number>> = {};

  return {
    ...input,
    columns: resultColumns,
    rows: input.rows.map((row) => {
      const newRow = { ...row };

      const bucketIdentifier = getBucketIdentifier(row, by);
      const previousValue = previousValues[bucketIdentifier];
      const currentValue = newRow[inputColumnId];
      if (currentValue != null && previousValue != null) {
        const currentValueAsNumber = Number(currentValue);
        if (currentValueAsNumber >= previousValue) {
          newRow[outputColumnId] = currentValueAsNumber - previousValue;
        } else {
          newRow[outputColumnId] = currentValueAsNumber;
        }
      } else {
        newRow[outputColumnId] = undefined;
      }

      if (currentValue != null) {
        previousValues[bucketIdentifier] = Number(currentValue);
      } else {
        previousValues[bucketIdentifier] = undefined;
      }

      return newRow;
    }),
  };
};
