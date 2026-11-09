/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import {
  isLogVolumeAnchor,
  isNonLogsIndexPattern,
  stripNonLogIndexParts,
} from './log_volume_anchor';

const seed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'logs.alert.document.count' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: {},
  ...overrides,
});

describe('isNonLogsIndexPattern', () => {
  it('rejects a pattern when any included part is metrics, traces, or APM data', () => {
    expect(isNonLogsIndexPattern('logs-*,metrics-*')).toBe(true);
    expect(isNonLogsIndexPattern('metrics')).toBe(true);
    expect(isNonLogsIndexPattern('metricbeat-*')).toBe(true);
    expect(isNonLogsIndexPattern('remote:traces-*')).toBe(true);
    expect(isNonLogsIndexPattern('.ds-traces-apm-default-2026.10.14-000001')).toBe(true);
    expect(isNonLogsIndexPattern('metrics::data')).toBe(true);
    expect(isNonLogsIndexPattern('logs-*,-metrics-*')).toBe(false);
    expect(isNonLogsIndexPattern('logs-*,filebeat-*')).toBe(false);
    expect(isNonLogsIndexPattern('shipping-traces-logs')).toBe(false);
    expect(isNonLogsIndexPattern('alerts-app-logs')).toBe(false);
    expect(isNonLogsIndexPattern('.alerts-security.alerts-default')).toBe(true);
  });

  it('strips non-log and alert parts while keeping remaining log indices', () => {
    expect(
      stripNonLogIndexParts(
        'logs-*,filebeat-*,alerts-app-logs,apm-*-transaction*,traces-apm*,.alerts-security.alerts-*,-metrics-*'
      )
    ).toBe('logs-*,filebeat-*,alerts-app-logs,-metrics-*');
    expect(stripNonLogIndexParts('.alerts-security.alerts-*,metrics-*')).toBeUndefined();
    expect(stripNonLogIndexParts('logs-endpoint.events.*')).toBe('logs-endpoint.events.*');
  });
});

describe('isLogVolumeAnchor', () => {
  it('rejects a log threshold ratio rule', () => {
    expect(isLogVolumeAnchor(seed({ metric: { operationType: 'ratio' } }))).toBe(false);
    expect(isLogVolumeAnchor(seed({ metric: { operationType: 'count' } }))).toBe(true);
  });

  it('allows Discover histogram and app menu seeds on logs and rejects single documents', () => {
    expect(
      isLogVolumeAnchor(
        seed({ origin: { app: 'discover', surface: 'histogram' }, indexPattern: 'logs-*' })
      )
    ).toBe(true);
    expect(
      isLogVolumeAnchor(
        seed({ origin: { app: 'discover', surface: 'appMenu' }, indexPattern: 'logs-*' })
      )
    ).toBe(true);
    expect(
      isLogVolumeAnchor(
        seed({ origin: { app: 'discover', surface: 'document' }, indexPattern: 'logs-*' })
      )
    ).toBe(false);
  });
});
