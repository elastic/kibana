/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keyOf, printedLabels } from '../../model/identity';
import { apportion, sharePercent } from '../../model/share';

import type { DonutNode } from './schema';

export interface DonutPart {
  key: string;
  /** The label, followed by the key where another part shares it. */
  label: string;
  value: number;
  /** Percent of the total, to one decimal, summing to exactly 100 across parts; `null` when the total is zero. */
  share: number | null;
}

/** A donut with keys resolved and shares derived, in authored order, for every surface. */
export interface ResolvedDonut {
  parts: readonly DonutPart[];
  total: number;
}

export const resolveDonut = ({ parts }: DonutNode): ResolvedDonut => {
  const total = parts.reduce((sum, { value }) => sum + value, 0);
  const steps = apportion(parts.map(({ value }) => value));
  const labels = printedLabels(parts);
  return {
    parts: parts.map((part, index) => ({
      key: keyOf(part),
      label: labels[index]!,
      value: part.value,
      share: steps === undefined ? null : sharePercent(steps[index]!),
    })),
    total,
  };
};
