/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMonitoringService } from './rule_monitoring_service';
import { getDefaultMonitoring } from '../lib/monitoring';

const mockNow = '2020-01-01T02:00:00.000Z';

const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

describe('RuleMonitoringService', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(mockNow).getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should initialize with default monitoring', () => {
    const ruleMonitoringService = new RuleMonitoringService();
    expect(ruleMonitoringService.getMonitoring()).toEqual(
      getDefaultMonitoring(new Date(mockNow).toISOString())
    );
  });

  it('should add history', () => {
    const ruleMonitoringService = new RuleMonitoringService();

    jest.advanceTimersByTime(ONE_HOUR);
    const firstRunDate = new Date();

    ruleMonitoringService.addHistory({
      duration: ONE_MINUTE,
      hasError: false,
      runDate: firstRunDate,
    });

    jest.advanceTimersByTime(ONE_HOUR);
    const secondRunDate = new Date();

    ruleMonitoringService.addHistory({
      duration: 2 * ONE_MINUTE,
      hasError: true,
      runDate: secondRunDate,
    });

    const { run } = ruleMonitoringService.getMonitoring();
    const { history, last_run: lastRun, calculated_metrics: calculatedMetrics } = run;
    const { timestamp, metrics } = lastRun;

    expect(history.length).toEqual(2);
    expect(history[0]).toEqual({
      success: true,
      timestamp: firstRunDate.getTime(),
      duration: ONE_MINUTE,
    });
    expect(history[1]).toEqual({
      success: false,
      timestamp: secondRunDate.getTime(),
      duration: 2 * ONE_MINUTE,
    });

    expect(timestamp).toEqual(secondRunDate.toISOString());
    expect(metrics.duration).toEqual(2 * ONE_MINUTE);

    expect(calculatedMetrics).toEqual({ success_ratio: 0.5, p50: 90000, p95: 120000, p99: 120000 });
  });

  describe('setters', () => {
    it('should set monitoring', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const customMonitoring = {
        run: {
          history: [
            {
              success: true,
              duration: 100000,
              timestamp: 0,
            },
          ],
          calculated_metrics: {
            success_ratio: 1,
            p50: 100,
            p95: 1000,
            p99: 10000,
          },
          last_run: {
            timestamp: mockNow,
            metrics: {
              duration: 100000,
            },
          },
        },
      };
      ruleMonitoringService.setMonitoring(customMonitoring);
      expect(ruleMonitoringService.getMonitoring()).toEqual(customMonitoring);
    });

    it('should set totalSearchDurationMs', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsTotalSearchDurationMs } =
        ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsTotalSearchDurationMs(123);

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.total_search_duration_ms).toEqual(123);
    });

    it('should set totalIndexDurationMs', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsTotalIndexingDurationMs } =
        ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsTotalIndexingDurationMs(234);

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.total_indexing_duration_ms).toEqual(234);
    });

    it('should set totalAlertsDetected', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsTotalAlertsDetected } =
        ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsTotalAlertsDetected(345);

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.total_alerts_detected).toEqual(345);
    });

    it('should set totalAlertsCreated', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsTotalAlertsCreated } =
        ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsTotalAlertsCreated(456);

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.total_alerts_created).toEqual(456);
    });

    it('should set gapDurationS', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsGapDurationS } = ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsGapDurationS(567);

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.gap_duration_s).toEqual(567);
    });

    it('should set gapRange', () => {
      const ruleMonitoringService = new RuleMonitoringService();
      const { setLastRunMetricsGapRange } = ruleMonitoringService.getLastRunMetricsSetters();
      setLastRunMetricsGapRange({
        gte: '2020-01-01T00:00:00.000Z',
        lte: '2020-01-01T01:00:00.000Z',
      });

      const {
        run: {
          last_run: { metrics },
        },
      } = ruleMonitoringService.getMonitoring();
      expect(metrics.gap_range?.gte).toEqual('2020-01-01T00:00:00.000Z');
      expect(metrics.gap_range?.lte).toEqual('2020-01-01T01:00:00.000Z');
    });
  });
});
