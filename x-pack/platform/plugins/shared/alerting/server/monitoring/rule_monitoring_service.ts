/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { getDefaultMonitoring, getExecutionDurationPercentiles } from '../lib/monitoring';
import type {
  RuleMonitoring,
  RuleMonitoringHistory,
  PublicRuleMonitoringService,
  ConsumerExecutionMetrics,
} from '../types';

interface FrameworkMetrics {
  total_search_duration_ms: number;
}

export class RuleMonitoringService {
  // Mirrors rule's SO state
  private monitoring: RuleMonitoring = getDefaultMonitoring(new Date().toISOString());
  // Metrics calculated by the framework
  private frameworkMetrics: Partial<FrameworkMetrics> = {};
  // Rule executor metrics. Essential metrics get written to rule's SO.
  private metrics: Partial<ConsumerExecutionMetrics> = {};

  public setLastRunMetricsDuration(duration: number) {
    this.monitoring.run.last_run.metrics.duration = duration;
  }

  public setMonitoring(monitoringFromSO: RuleMonitoring | undefined) {
    if (monitoringFromSO) {
      this.monitoring = monitoringFromSO;
    }
  }

  public getMonitoring(): RuleMonitoring {
    const result = cloneDeep(this.monitoring);

    Object.assign(result.run.last_run.metrics, {
      total_search_duration_ms: this.frameworkMetrics.total_search_duration_ms ?? null,
      total_indexing_duration_ms: this.metrics.total_indexing_duration_ms ?? null,
      gap_duration_s: this.metrics.gap_duration_s ?? null,
      gap_range: this.metrics.gap_range ?? null,
      gap_reason: this.metrics.gap_reason ?? null,
    });

    return result;
  }

  public getExecutorMetrics(): Partial<ConsumerExecutionMetrics> | undefined {
    if (Object.values(this.metrics).some((v) => v != null)) {
      return this.metrics;
    }
  }

  public addFrameworkMetrics(fwkMetrics: Partial<FrameworkMetrics>): void {
    this.frameworkMetrics = fwkMetrics;
  }

  public addHistory({
    duration,
    hasError = true,
    runDate,
  }: {
    duration: number | undefined;
    hasError: boolean;
    runDate: Date;
  }) {
    const date = runDate ?? new Date();
    const monitoringHistory: RuleMonitoringHistory = {
      success: true,
      timestamp: date.getTime(),
    };
    if (null != duration) {
      monitoringHistory.duration = duration;
      this.setLastRunMetricsDuration(duration);
    }
    if (hasError) {
      monitoringHistory.success = false;
    }
    this.monitoring.run.last_run.timestamp = date.toISOString();
    this.monitoring.run.history.push(monitoringHistory);
    this.monitoring.run.calculated_metrics = {
      success_ratio: this.buildExecutionSuccessRatio(),
      ...this.buildExecutionDurationPercentiles(),
    };
  }

  public getSetters(): PublicRuleMonitoringService {
    return {
      setMetric: this.setMetric.bind(this),
      setMetrics: this.setMetrics.bind(this),
      clearGap: this.clearGap.bind(this),
    };
  }

  private clearGap(): void {
    delete this.metrics.gap_range;
    delete this.metrics.gap_reason;
  }

  private buildExecutionSuccessRatio() {
    const { history } = this.monitoring.run;
    return history.filter(({ success }) => success).length / history.length;
  }

  private buildExecutionDurationPercentiles = () => {
    const { history } = this.monitoring.run;
    return getExecutionDurationPercentiles(history);
  };

  private setMetric = <MetricName extends keyof ConsumerExecutionMetrics>(
    metricName: MetricName,
    value: ConsumerExecutionMetrics[MetricName]
  ) => {
    this.metrics[metricName] = value;
  };

  private setMetrics = (metrics: Partial<ConsumerExecutionMetrics>) => {
    for (const [metricName, value] of Object.entries(metrics)) {
      this.setMetric(metricName as keyof ConsumerExecutionMetrics, value);
    }
  };
}
