/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleMonitoring, RuleMonitoringHistory } from '../types';
import {
  getExecutionDurationPercentiles,
  updateMonitoring,
  convertMonitoringFromRawAndVerify,
  resetMonitoringLastRun,
} from './monitoring';

const mockHistory: RuleMonitoringHistory[] = [
  {
    timestamp: 1655427600000,
    success: true,
    duration: 100,
  },
  {
    timestamp: 1655427900000,
    success: true,
    duration: 200,
  },
  {
    timestamp: 1655428200000,
    success: false,
    duration: 300,
  },
  {
    timestamp: 1655428500000,
    success: false,
    duration: 100,
  },
  {
    timestamp: 1655428800000,
    success: false,
  },
  {
    timestamp: 1655429100000,
    success: true,
  },
  {
    timestamp: 1655429400000,
    success: true,
    duration: 400,
  },
  {
    timestamp: 1655429700000,
    success: true,
    duration: 500,
  },
];

const mockRuleMonitoring: RuleMonitoring = {
  run: {
    history: mockHistory,
    calculated_metrics: {
      success_ratio: 0,
    },
    last_run: {
      timestamp: '2022-06-18T01:00:00.000Z',
      metrics: {
        duration: 123,
      },
    },
  },
};

describe('getExecutionDurationPercentiles', () => {
  it('Calculates the percentile given partly undefined durations', () => {
    const percentiles = getExecutionDurationPercentiles(mockRuleMonitoring.run.history);
    expect(percentiles.p50).toEqual(250);
    expect(percentiles.p95).toEqual(500);
    expect(percentiles.p99).toEqual(500);
  });

  it('Returns empty object when given all undefined durations', () => {
    // remove all duration fields
    const nullDurationHistory: RuleMonitoringHistory[] = mockHistory.map((history) => ({
      timestamp: history.timestamp,
      success: history.success,
    }));

    const newMockRuleMonitoring: RuleMonitoring = {
      ...mockRuleMonitoring,
      run: {
        ...mockRuleMonitoring.run,
        history: nullDurationHistory,
      },
    };

    const percentiles = getExecutionDurationPercentiles(newMockRuleMonitoring.run.history);
    expect(Object.keys(percentiles).length).toEqual(0);
  });
});

describe('resetMonitoringLastRun', () => {
  it('resets last run metrics to the initial default value', () => {
    const result = resetMonitoringLastRun(mockRuleMonitoring);
    expect(result.run.last_run.metrics).toEqual({
      duration: 0,
      total_search_duration_ms: null,
      total_indexing_duration_ms: null,
      total_alerts_detected: null,
      total_alerts_created: null,
      gap_duration_s: null,
      // TODO: uncomment after intermidiate release
      // gap_range: null,
    });
  });

  it('preserves last run timestamp', () => {
    const expectedTimestamp = mockRuleMonitoring.run.last_run.timestamp;
    const result = resetMonitoringLastRun(mockRuleMonitoring);
    expect(result.run.last_run.timestamp).toEqual(expectedTimestamp);
  });

  it('preserves other monitoring properties', () => {
    const { run: originalRun, ...originalRestOfMonitoringObject } = mockRuleMonitoring;
    const { last_run: originalLastRun, ...originalRestOfRunObject } = originalRun;

    const result = resetMonitoringLastRun(mockRuleMonitoring);

    const { run: actualRun, ...actualRestOfMonitoringObject } = result;
    const { last_run: actualLastRun, ...actualRestOfRunObject } = actualRun;

    expect(actualRestOfMonitoringObject).toEqual(originalRestOfMonitoringObject);
    expect(actualRestOfRunObject).toEqual(originalRestOfRunObject);
  });
});

describe('updateMonitoring', () => {
  it('can update monitoring', () => {
    const result = updateMonitoring({
      monitoring: mockRuleMonitoring,
      timestamp: '2022-07-18T01:00:00.000Z',
      duration: 1000,
    });

    expect(result.run.history).toEqual(mockRuleMonitoring.run.history);
    expect(result.run.calculated_metrics).toEqual(mockRuleMonitoring.run.calculated_metrics);
    expect(result.run.last_run.timestamp).toEqual('2022-07-18T01:00:00.000Z');
    expect(result.run.last_run.metrics.duration).toEqual(1000);
  });
});

describe('convertMonitoringFromRawAndVerify', () => {
  it('can convert monitoring to raw and verify the duration', () => {
    const monitoring = {
      run: {
        ...mockRuleMonitoring.run,
        last_run: {
          ...mockRuleMonitoring.run.last_run,
          timestamp: 'invalid',
        },
      },
    };

    const mockLoggerDebug = jest.fn();
    const mockLogger = {
      debug: mockLoggerDebug,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = convertMonitoringFromRawAndVerify(mockLogger as any, '123', monitoring);
    expect(mockLoggerDebug).toHaveBeenCalledWith(
      'invalid monitoring last_run.timestamp "invalid" in raw rule 123'
    );
    expect(Date.parse(result!.run.last_run.timestamp)).toBeTruthy();
  });
});
