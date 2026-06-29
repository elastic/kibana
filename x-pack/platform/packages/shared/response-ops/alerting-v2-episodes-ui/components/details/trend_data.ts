/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Comparator, type AlertCondition } from '@kbn/alerting-v2-rule-form';
import type { EpisodeTrendRow } from '../../queries/episode_trend_query';
import type { TrendSeries, TrendThreshold } from './trend_types';

/**
 * Pivots `.rule-events` rows into one {@link TrendSeries} per requested label,
 * reading each label's value from the event's evaluated metrics. Events without
 * a value for a label (e.g. status-only recovery events with empty data) yield a
 * `null` point, so the line breaks where the rule recorded no value.
 */
export const mapEventDataToSeries = (
  rows: Array<Pick<EpisodeTrendRow, '@timestamp' | 'metrics'>>,
  seriesLabels: string[]
): TrendSeries[] => {
  const points = rows
    .map((row) => ({ x: Date.parse(row['@timestamp']), metrics: row.metrics }))
    .filter(({ x }) => !Number.isNaN(x));

  return seriesLabels.map((label) => ({
    id: label,
    label,
    points: points.map(({ x, metrics }) => ({ x, y: metrics[label] ?? null })),
  }));
};

const labelFor = (condition: AlertCondition): string => {
  const { metric, comparator, threshold } = condition;
  if (comparator === Comparator.BETWEEN)
    return `${metric} between ${threshold[0]} and ${threshold[1]}`;
  if (comparator === Comparator.NOT_BETWEEN)
    return `${metric} not between ${threshold[0]} and ${threshold[1]}`;
  return `${metric} ${comparator} ${threshold[0]}`;
};

/** Converts parsed alert conditions into horizontal threshold lines. */
export const deriveTrendThresholds = (conditions: AlertCondition[]): TrendThreshold[] =>
  conditions
    .filter((c) => c.metric && c.threshold.length > 0)
    .map((c) => ({ id: c.id, metric: c.metric, label: labelFor(c), values: [...c.threshold] }));
