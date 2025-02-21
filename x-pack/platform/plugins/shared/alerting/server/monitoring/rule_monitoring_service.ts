/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultMonitoring, getExecutionDurationPercentiles } from '../lib/monitoring';
import { RuleMonitoring, RuleMonitoringHistory, PublicRuleMonitoringService } from '../types';

export class RuleMonitoringService {
  private monitoring: RuleMonitoring = getDefaultMonitoring(new Date().toISOString());

  public setLastRunMetricsDuration(duration: number) {
    this.monitoring.run.last_run.metrics.duration = duration;
  }

  public setMonitoring(monitoringFromSO: RuleMonitoring | undefined) {
    if (monitoringFromSO) {
      this.monitoring = monitoringFromSO;
    }
  }

  public getMonitoring(): RuleMonitoring {
    return this.monitoring;
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

  public getLastRunMetricsSetters(): PublicRuleMonitoringService {
    return {
      setLastRunMetricsTotalSearchDurationMs:
        this.setLastRunMetricsTotalSearchDurationMs.bind(this),
      setLastRunMetricsTotalIndexingDurationMs:
        this.setLastRunMetricsTotalIndexingDurationMs.bind(this),
      setLastRunMetricsTotalAlertsDetected: this.setLastRunMetricsTotalAlertsDetected.bind(this),
      setLastRunMetricsTotalAlertsCreated: this.setLastRunMetricsTotalAlertsCreated.bind(this),
      setLastRunMetricsGapDurationS: this.setLastRunMetricsGapDurationS.bind(this),
      setLastRunMetricsGapRange: this.setLastRunMetricsGapRange.bind(this),
    };
  }

  private setLastRunMetricsTotalSearchDurationMs(totalSearchDurationMs: number) {
    this.monitoring.run.last_run.metrics.total_search_duration_ms = totalSearchDurationMs;
  }

  private setLastRunMetricsTotalIndexingDurationMs(totalIndexingDurationMs: number) {
    this.monitoring.run.last_run.metrics.total_indexing_duration_ms = totalIndexingDurationMs;
  }

  private setLastRunMetricsTotalAlertsDetected(totalAlertDetected: number) {
    this.monitoring.run.last_run.metrics.total_alerts_detected = totalAlertDetected;
  }

  private setLastRunMetricsTotalAlertsCreated(totalAlertCreated: number) {
    this.monitoring.run.last_run.metrics.total_alerts_created = totalAlertCreated;
  }

  private setLastRunMetricsGapDurationS(gapDurationS: number) {
    this.monitoring.run.last_run.metrics.gap_duration_s = gapDurationS;
  }

  private setLastRunMetricsGapRange(gap: { lte: string; gte: string } | null) {
    this.monitoring.run.last_run.metrics.gap_range = gap;
  }

  private buildExecutionSuccessRatio() {
    const { history } = this.monitoring.run;
    return history.filter(({ success }) => success).length / history.length;
  }

  private buildExecutionDurationPercentiles = () => {
    const { history } = this.monitoring.run;
    return getExecutionDurationPercentiles(history);
  };
}
