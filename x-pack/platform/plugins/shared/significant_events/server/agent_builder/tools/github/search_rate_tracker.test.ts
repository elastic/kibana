/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getGithubSearchRateReport,
  recordGithubSearchCodeCall,
  resetGithubSearchRateReport,
} from './search_rate_tracker';

describe('GitHub search rate tracker', () => {
  beforeEach(() => resetGithubSearchRateReport('default'));

  it('computes the maximum rolling 60-second request count', () => {
    for (let index = 0; index < 11; index += 1) {
      recordGithubSearchCodeCall('default', {
        timestamp: new Date(Date.UTC(2026, 6, 17, 12, 0, index * 5)).toISOString(),
        toolCallId: `call-${index}`,
        phase: 'logging-sites',
        repository: 'open-telemetry/opentelemetry-demo',
        serviceName: 'checkoutservice',
        query: `query-${index}`,
        status: 'success',
        durationMs: 10,
      });
    }

    const report = getGithubSearchRateReport('default');
    expect(report.total).toBe(11);
    expect(report.maxRollingSixtySeconds).toBe(11);
    expect(report.windowsOverLimit).toBe(1);
    expect(report.byService.checkoutservice).toBe(11);
  });

  it('reports duplicate queries and failures', () => {
    for (const status of ['success', 'rate_limited'] as const) {
      recordGithubSearchCodeCall('default', {
        timestamp: new Date().toISOString(),
        toolCallId: status,
        phase: 'service-discovery',
        repository: 'open-telemetry/opentelemetry-demo',
        query: 'logger repo:open-telemetry/opentelemetry-demo',
        status,
        durationMs: 10,
      });
    }

    const report = getGithubSearchRateReport('default');
    expect(report.duplicateQueries).toBe(1);
    expect(report.rateLimited).toBe(1);
    expect(report.failed).toBe(0);
  });
});
