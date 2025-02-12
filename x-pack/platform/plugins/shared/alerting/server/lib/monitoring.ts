/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import stats from 'stats-lite';
import {
  RuleMonitoring,
  RawRuleMonitoring,
  RuleMonitoringHistory,
  RuleMonitoringLastRunMetrics,
} from '../types';
import { RuleDomain } from '../application/rule/types';

const INITIAL_LAST_RUN_METRICS: RuleMonitoringLastRunMetrics = {
  duration: 0,
  total_search_duration_ms: null,
  total_indexing_duration_ms: null,
  total_alerts_detected: null,
  total_alerts_created: null,
  gap_duration_s: null,
  // TODO: uncomment after intermidiate release
  // gap_range: null,
};

export const getDefaultMonitoring = (timestamp: string): RawRuleMonitoring => {
  return {
    run: {
      history: [],
      calculated_metrics: {
        success_ratio: 0,
      },
      last_run: {
        timestamp,
        metrics: INITIAL_LAST_RUN_METRICS,
      },
    },
  };
};

export const getDefaultMonitoringRuleDomainProperties = (
  timestamp: string
): RuleDomain['monitoring'] => {
  return {
    run: {
      history: [],
      calculated_metrics: {
        success_ratio: 0,
      },
      last_run: {
        timestamp,
        metrics: INITIAL_LAST_RUN_METRICS,
      },
    },
  };
};

export const resetMonitoringLastRun = (monitoring: RuleMonitoring): RawRuleMonitoring => {
  const { run, ...restMonitoring } = monitoring;
  const { last_run: lastRun, ...restRun } = run;

  return {
    ...restMonitoring,
    run: {
      ...restRun,
      last_run: {
        timestamp: lastRun.timestamp,
        metrics: INITIAL_LAST_RUN_METRICS,
      },
    },
  };
};

// Immutably updates the monitoring object with timestamp and duration.
// Used when converting from and between raw monitoring object
export const updateMonitoring = ({
  monitoring,
  timestamp,
  duration,
}: {
  monitoring: RuleMonitoring;
  timestamp: string;
  duration?: number;
}): RawRuleMonitoring => {
  const { run, ...restMonitoring } = monitoring;
  const { last_run: lastRun, ...restRun } = run;
  const { metrics = INITIAL_LAST_RUN_METRICS } = lastRun;

  return {
    ...restMonitoring,
    run: {
      ...restRun,
      last_run: {
        timestamp,
        metrics: {
          ...metrics,
          duration,
        },
      },
    },
  };
};

export const convertMonitoringFromRawAndVerify = (
  logger: Logger,
  ruleId: string,
  monitoring: RawRuleMonitoring
): RuleMonitoring | undefined => {
  if (!monitoring) {
    return undefined;
  }

  const lastRunDate = monitoring.run.last_run.timestamp;

  let parsedDateMillis = lastRunDate ? Date.parse(lastRunDate) : Date.now();
  if (isNaN(parsedDateMillis)) {
    logger.debug(`invalid monitoring last_run.timestamp "${lastRunDate}" in raw rule ${ruleId}`);
    parsedDateMillis = Date.now();
  }

  return updateMonitoring({
    monitoring,
    timestamp: new Date(parsedDateMillis).toISOString(),
    duration: monitoring.run.last_run.metrics.duration,
  });
};

export const getExecutionDurationPercentiles = (history: RuleMonitoringHistory[]) => {
  const durationSamples = history.reduce<number[]>((duration, historyItem) => {
    if (typeof historyItem.duration === 'number') {
      return [...duration, historyItem.duration];
    }
    return duration;
  }, []);

  if (durationSamples.length) {
    return {
      p50: stats.percentile(durationSamples as number[], 0.5),
      p95: stats.percentile(durationSamples as number[], 0.95),
      p99: stats.percentile(durationSamples as number[], 0.99),
    };
  }

  return {};
};
