/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import numeral from '@elastic/numeral';

/**
 * Formats a byte count for display, returning an em dash for `null` (used to signal that the value
 * could not be fetched, as opposed to a genuine `0`). Shows up to two decimals, dropping trailing
 * zeros (`500 B`, `1.5 KB`, `100 GB`).
 */
export const formatBytes = (bytes: number | null): string =>
  bytes === null ? '—' : numeral(bytes).format('0,0.[00] b');

/**
 * Formats a number with locale-aware thousands separators, returning an em dash for `null`.
 */
export const formatNumber = (n: number | null): string =>
  n === null ? '—' : new Intl.NumberFormat().format(n);
