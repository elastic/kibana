/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EvidenceChart,
  EvidenceReference,
  InvestigationEvidence,
} from '../../common/evidence';
import { isEvidenceLinkReference } from '../../common/evidence';

const formatRange = (values: number[]): string =>
  values.length === 0 ? 'no points' : `${Math.min(...values)} to ${Math.max(...values)}`;

const formatChart = (chart: EvidenceChart): string => {
  const unit = chart.y_axis.unit ? ` (${chart.y_axis.unit})` : '';
  const series = chart.series
    .map(
      ({ name, points }) =>
        `${name}: ${points.length} points, ${formatRange(points.map(({ y }) => y))}`
    )
    .join('; ');
  const annotations = (chart.annotations ?? [])
    .map(({ x, x_end: xEnd, label }) => `${label} at ${xEnd ? `${x}..${xEnd}` : x}`)
    .join('; ');
  return [
    `Chart "${chart.title}" (${chart.type}, ${chart.x_axis.type} x axis${unit}): ${series}`,
    annotations ? `Annotations: ${annotations}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
};

const formatReference = (reference: EvidenceReference): string =>
  isEvidenceLinkReference(reference)
    ? `Link: ${reference.label ? `${reference.label}: ` : ''}${reference.url}`
    : `Query: ${reference.query}`;

/**
 * Compact text of a piece of evidence for the LLM: the Markdown description and a one-line
 * summary of the chart (not its raw points), and its references.
 */
export const formatEvidenceForAgent = ({
  description,
  chart,
  references = [],
}: InvestigationEvidence): string =>
  [description?.trim() || undefined, chart ? formatChart(chart) : undefined]
    .concat(references.map(formatReference))
    .filter((part): part is string => part !== undefined)
    .join('\n');
