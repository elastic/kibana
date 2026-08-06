/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const BYTE_SIZE_MULTIPLIERS = {
  b: 1,
  kb: 1024,
  mb: 1024 ** 2,
  gb: 1024 ** 3,
  tb: 1024 ** 4,
} as const;

export type ByteSizeUnit = keyof typeof BYTE_SIZE_MULTIPLIERS;

export const DEFAULT_MAX_FIELD_SIZE_UNIT: ByteSizeUnit = 'mb';

export const BYTE_SIZE_UNIT_OPTIONS: Array<{ value: ByteSizeUnit; text: string }> = [
  { value: 'b', text: 'B' },
  { value: 'kb', text: 'KB' },
  { value: 'mb', text: 'MB' },
  { value: 'gb', text: 'GB' },
  { value: 'tb', text: 'TB' },
];

export const parseStoredMaxFieldSizeBytes = (value: string): number | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
};

export const bytesToDisplayValue = (bytes: number, unit: ByteSizeUnit): number =>
  bytes / BYTE_SIZE_MULTIPLIERS[unit];

export const displayValueToBytes = (value: number, unit: ByteSizeUnit): number =>
  Math.round(value * BYTE_SIZE_MULTIPLIERS[unit]);

export const formatMaxFieldSizeDisplayValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '';
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(Number(value.toPrecision(6)));
};

export const pickBestByteSizeUnit = (bytes: number): ByteSizeUnit => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return DEFAULT_MAX_FIELD_SIZE_UNIT;
  }

  const preferredUnits: ByteSizeUnit[] = ['tb', 'gb', 'mb', 'kb', 'b'];

  for (const unit of preferredUnits) {
    const display = bytesToDisplayValue(bytes, unit);
    if (display >= 1 && Number.isInteger(display)) {
      return unit;
    }
  }

  for (const unit of preferredUnits) {
    if (bytesToDisplayValue(bytes, unit) >= 1) {
      return unit;
    }
  }

  return 'b';
};

export const getMaxFieldSizeDisplayState = (
  storedValue: string
): { displayValue: string; unit: ByteSizeUnit } => {
  const bytes = parseStoredMaxFieldSizeBytes(storedValue);

  if (bytes === undefined) {
    return {
      displayValue: '',
      unit: DEFAULT_MAX_FIELD_SIZE_UNIT,
    };
  }

  const unit = pickBestByteSizeUnit(bytes);

  return {
    displayValue: formatMaxFieldSizeDisplayValue(bytesToDisplayValue(bytes, unit)),
    unit,
  };
};
