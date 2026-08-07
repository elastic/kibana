/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { includes, isEmpty, isString, lowerCase } from 'lodash';

export enum EpisodeSeverity {
  Info = 'info',
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

/** Supported severities in ascending chart-order (info → critical). */
export const EPISODE_SEVERITIES: EpisodeSeverity[] = [
  EpisodeSeverity.Info,
  EpisodeSeverity.Low,
  EpisodeSeverity.Medium,
  EpisodeSeverity.High,
  EpisodeSeverity.Critical,
];

/** Numeric rank used for ES|QL severity sort and chart axes. */
export const EPISODE_SEVERITY_CHART_VALUE: Record<EpisodeSeverity, number> = {
  [EpisodeSeverity.Info]: 0,
  [EpisodeSeverity.Low]: 1,
  [EpisodeSeverity.Medium]: 2,
  [EpisodeSeverity.High]: 3,
  [EpisodeSeverity.Critical]: 4,
};

/** Filter token for episodes with no aggregated severity. */
export const EPISODE_SEVERITY_FILTER_NONE = '__no_severity__';

export const isSupportedEpisodeSeverity = (
  severity: string | undefined | null
): severity is string => {
  if (!isString(severity) || isEmpty(severity)) {
    return false;
  }

  return includes(EPISODE_SEVERITIES, lowerCase(severity));
};

export const normalizeEpisodeSeverity = (severity: string): EpisodeSeverity => {
  return lowerCase(severity) as EpisodeSeverity;
};
