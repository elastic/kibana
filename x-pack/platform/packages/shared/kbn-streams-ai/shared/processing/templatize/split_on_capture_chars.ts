/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BRACKET_PAIRS } from './mask_capturing_brackets';
import { QUOTE_PAIRS } from './mask_quotes';

export const ALL_PAIRS = {
  ...QUOTE_PAIRS,
  ...BRACKET_PAIRS,
};

const allCaptureChars = Object.entries(ALL_PAIRS).flat();

const allPairEntries = Object.entries(ALL_PAIRS);

export function isCaptureChar(value: string): boolean {
  return allCaptureChars.includes(value);
}

export function splitOnCaptureChars(value: string) {
  const pairs = allPairEntries.find(([start, end]) => {
    return value.startsWith(start) && value.endsWith(end);
  });

  if (!pairs) {
    return undefined;
  }

  const start = pairs[0].length;
  const end = pairs[1].length;

  return [value.slice(0, start), value.slice(start, -end), value.slice(-end)];
}
