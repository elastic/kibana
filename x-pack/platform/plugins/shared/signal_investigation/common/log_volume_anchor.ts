/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRegExpPatternFrom } from '@kbn/data-view-utils';
import type { InvestigationSeed } from '@kbn/investigation-seed';

const LOG_THRESHOLD_RULE_TYPE_ID = 'logs.alert.document.count';
const CUSTOM_THRESHOLD_RULE_TYPE_ID = 'observability.rules.custom_threshold';
const NON_LOG_INDEX_PATTERN = createRegExpPatternFrom(
  ['metrics', 'metricbeat', 'traces', 'apm'],
  'data',
  { allowPrefix: false }
);
const ALERT_INDEX_PATTERN = /(?:^|:)(?:\.ds-)?\.(?:internal\.)?alerts-/i;

const isExcludedLogIndexPart = (trimmedPart: string): boolean =>
  NON_LOG_INDEX_PATTERN.test(trimmedPart) || ALERT_INDEX_PATTERN.test(trimmedPart);

/**
 * Strips metrics, traces, Metricbeat, APM, and `.alerts-*` parts from a comma-separated
 * index pattern. Returns the remaining log parts, or undefined when none remain.
 */
export const stripNonLogIndexParts = (indexPattern: string | undefined): string | undefined => {
  if (typeof indexPattern !== 'string' || indexPattern.trim().length === 0) {
    return undefined;
  }

  const kept: string[] = [];
  let hasPositiveLogPart = false;
  for (const part of indexPattern.split(',')) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      continue;
    }
    if (trimmed.startsWith('-')) {
      kept.push(trimmed);
      continue;
    }
    if (!isExcludedLogIndexPart(trimmed)) {
      kept.push(trimmed);
      hasPositiveLogPart = true;
    }
  }

  return hasPositiveLogPart ? kept.join(',') : undefined;
};

/** True when any included index pattern is metrics, traces, Metricbeat, APM, or `.alerts-*` data. */
export const isNonLogsIndexPattern = (indexPattern: string | undefined): boolean => {
  if (typeof indexPattern !== 'string' || indexPattern.trim().length === 0) {
    return false;
  }

  return indexPattern.split(',').some((part) => {
    const trimmed = part.trim();
    if (trimmed.length === 0 || trimmed.startsWith('-')) {
      return false;
    }
    return isExcludedLogIndexPart(trimmed);
  });
};

/**
 * Returns true when the seed represents a change in log volume: a Discover app menu
 * action or log histogram brush, a log threshold alert, a custom threshold alert with a
 * count aggregation on a logs index, or a Lens chart whose metric is count on a logs data view.
 */
export const isLogVolumeAnchor = (seed: InvestigationSeed): boolean => {
  if (isNonLogsIndexPattern(seed.indexPattern)) {
    return false;
  }

  const metricOp = seed.metric?.operationType;

  if (seed.origin.app === 'discover') {
    if (seed.origin.surface === 'document') {
      return false;
    }
    return metricOp === undefined || metricOp === 'count';
  }

  if (seed.origin.app === 'alerts') {
    if (seed.origin.ruleTypeId === LOG_THRESHOLD_RULE_TYPE_ID) {
      return metricOp === undefined || metricOp === 'count';
    }
    if (seed.origin.ruleTypeId === CUSTOM_THRESHOLD_RULE_TYPE_ID) {
      return metricOp === 'count';
    }
    return false;
  }

  return metricOp === 'count';
};
