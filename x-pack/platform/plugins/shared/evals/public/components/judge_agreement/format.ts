/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ConfidenceInterval } from '@kbn/evals-common';

export const NOT_AVAILABLE = i18n.translate('xpack.evals.judgeAgreement.notAvailable', {
  defaultMessage: 'n/a',
});

const fixed = (value: number): string => value.toFixed(2);

export const formatMetric = (value: number | null): string =>
  value === null ? NOT_AVAILABLE : fixed(value);

export const formatInterval = (interval: ConfidenceInterval | null): string =>
  interval === null ? '' : `[${fixed(interval.low)}, ${fixed(interval.high)}]`;

/** `0.71 [0.58, 0.82]`, or `n/a` when the metric is undefined for the labels collected so far. */
export const formatMetricWithInterval = (
  value: number | null,
  interval: ConfidenceInterval | null
): string =>
  value === null ? NOT_AVAILABLE : `${fixed(value)} ${formatInterval(interval)}`.trim();

export const formatPercent = (value: number | null): string =>
  value === null ? NOT_AVAILABLE : `${Math.round(value * 100)}%`;
