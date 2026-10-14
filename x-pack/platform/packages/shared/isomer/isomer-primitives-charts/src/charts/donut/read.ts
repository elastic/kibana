/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../../model/format';
import { formatShare } from '../../model/share';
import type { ChartReading } from '../../render/surfaces';

import { type DonutPart, resolveDonut } from './model';
import type { DonutNode } from './schema';

/** Words the text surfaces print, in one place. */
const copy = {
  columns: ['Part', 'Value', 'Share'] as const,
  nothingToSplit: 'Every part is zero, so there is nothing to split.',
  largest: (label: string, value: string, share: string, total: string) =>
    `${label} is the largest part at ${value}, ${share} of the ${total} total.`,
  tied: (labels: readonly string[], value: string, total: string) =>
    `${listed(labels)} tie as the largest parts at ${value} each, of the ${total} total.`,
};

const listed = (labels: readonly string[]): string =>
  labels.length === 2
    ? `${labels[0]} and ${labels[1]}`
    : `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;

/** A share in percent, printed with up to one decimal; missing when the total is zero. */
const summary = (node: DonutNode): string => {
  const { parts, total } = resolveDonut(node);
  if (total === 0) {
    return copy.nothingToSplit;
  }
  const top = parts.reduce((max, { value }) => Math.max(max, value), 0);
  const largest: DonutPart[] = parts.filter(({ value }) => value === top);
  const value = formatValue(top, node.format);
  const sum = formatValue(total, node.format);
  if (largest.length > 1) {
    return copy.tied(
      largest.map(({ label }) => label),
      value,
      sum
    );
  }
  const [{ label, share }] = largest as [DonutPart];
  return copy.largest(label, value, formatShare(share), sum);
};

/** One row per part in authored order: its label, value, and share of the total. */
export const read = (node: DonutNode): ChartReading => ({
  summary: summary(node),
  table: {
    columns: copy.columns,
    rows: resolveDonut(node).parts.map(({ label, value, share }) => [
      label,
      formatValue(value, node.format),
      formatShare(share),
    ]),
  },
});
