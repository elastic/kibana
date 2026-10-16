/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIPv6 } from 'net';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

const normalizeString = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed !== '' && Number.isFinite(Number(trimmed))) {
    return String(Number(trimmed));
  }
  if (ISO_TIMESTAMP.test(trimmed)) {
    const time = Date.parse(trimmed);
    return Number.isNaN(time) ? trimmed : new Date(time).toISOString();
  }
  if (isIPv6(trimmed)) {
    return new URL(`http://[${trimmed}]`).hostname;
  }
  return trimmed;
};

const normalizeScalar = (value: unknown): string => {
  if (typeof value === 'string') {
    return normalizeString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Canonical form of a field value, so numbers and numeric strings, timestamp precision,
 * IPv6 notation, and array order or single-element arrays don't cause false mismatches.
 */
export const normalizeValue = (value: unknown): string => {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(normalizeScalar))].sort().join('\u0000');
};
