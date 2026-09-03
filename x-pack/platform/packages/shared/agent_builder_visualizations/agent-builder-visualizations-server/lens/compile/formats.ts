/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type IntentUnit = 'percent' | 'bytes' | 'bits' | 'ms' | 's' | 'us' | 'ns';

export type LensFormat =
  | { type: 'percent' }
  | { type: 'bytes' }
  | { type: 'bits' }
  | { type: 'duration'; from: 'ms' | 's' | 'us' | 'ns'; to: 'auto-approximate' };

const BYTES_NAME = /byte|bytes|disk|storage|payload|memory/i;
const BITS_NAME = /\bbits?\b|network.*rate|throughput/i;

export const formatFromUnit = (unit: IntentUnit): LensFormat => {
  switch (unit) {
    case 'percent':
      return { type: 'percent' };
    case 'bytes':
      return { type: 'bytes' };
    case 'bits':
      return { type: 'bits' };
    case 'ms':
      return { type: 'duration', from: 'ms', to: 'auto-approximate' };
    case 's':
      return { type: 'duration', from: 's', to: 'auto-approximate' };
    case 'us':
      return { type: 'duration', from: 'us', to: 'auto-approximate' };
    case 'ns':
      return { type: 'duration', from: 'ns', to: 'auto-approximate' };
    default: {
      const exhaustive: never = unit;
      return exhaustive;
    }
  }
};

export const formatFromColumnName = (columnName: string): LensFormat | undefined => {
  if (BITS_NAME.test(columnName)) {
    return { type: 'bits' };
  }
  if (BYTES_NAME.test(columnName)) {
    return { type: 'bytes' };
  }
  return undefined;
};

export const resolveColumnFormat = (
  columnName: string,
  units?: Record<string, IntentUnit>
): LensFormat | undefined => {
  const unit = units?.[columnName];
  if (unit) {
    return formatFromUnit(unit);
  }
  return formatFromColumnName(columnName);
};
