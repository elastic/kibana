/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSeed } from '@kbn/investigation-seed';
import { analyzerApplies, inapplicabilityMessage } from './analyzer_applicability';

const seed = (
  entities: InvestigationSeed['entities'] = {},
  query?: InvestigationSeed['query'],
  overrides: Partial<InvestigationSeed> = {}
): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.threshold' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities,
  ...(query ? { query } : {}),
  ...overrides,
});

describe('analyzerApplies', () => {
  it('skips the APM change-point analyzers when the seed has no service name', () => {
    expect(analyzerApplies('service_change_points', seed())).toBe(false);
    expect(analyzerApplies('dependency_change_points', seed())).toBe(false);
    expect(analyzerApplies('service_change_points', seed({ 'service.name': 'checkout' }))).toBe(
      true
    );
  });

  it('runs log change points for a service or host, and skips ES|QL seeds', () => {
    expect(analyzerApplies('log_change_points', seed())).toBe(false);
    expect(analyzerApplies('log_change_points', seed({ 'host.name': 'web-1' }))).toBe(true);
    expect(analyzerApplies('metric_change_points', seed())).toBe(false);
    expect(analyzerApplies('metric_change_points', seed({ 'host.name': 'web-1' }))).toBe(true);
    expect(analyzerApplies('metric_change_points', seed({}, undefined, { hosts: ['web-1'] }))).toBe(
      true
    );
    expect(
      analyzerApplies(
        'log_change_points',
        seed({ 'service.name': 'checkout' }, { esql: 'FROM logs-*' })
      )
    ).toBe(false);
  });

  it('runs log rate analysis only on log-volume anchors and skips single documents and latency alerts', () => {
    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'logs.alert.document.count' },
        })
      )
    ).toBe(true);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: {
            app: 'alerts',
            alertId: 'alert-1',
            ruleTypeId: 'observability.rules.custom_threshold',
          },
          metric: { operationType: 'count' },
          indexPattern: 'logs-*',
        })
      )
    ).toBe(true);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: { app: 'discover', surface: 'histogram' },
        })
      )
    ).toBe(true);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: { app: 'dashboard', panelId: 'p-1' },
          metric: { operationType: 'count' },
          indexPattern: 'logs-*',
        })
      )
    ).toBe(true);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({ 'service.name': 'checkout' }, undefined, {
          origin: { app: 'alerts', alertId: 'alert-1', ruleTypeId: 'apm.transaction_duration' },
        })
      )
    ).toBe(false);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: { app: 'discover', surface: 'document', documentId: 'doc-1' },
        })
      )
    ).toBe(false);

    expect(
      analyzerApplies(
        'log_rate_analysis',
        seed(
          {},
          { esql: 'FROM logs-*' },
          {
            origin: { app: 'discover', surface: 'appMenu' },
          }
        )
      )
    ).toBe(true);

    expect(
      inapplicabilityMessage(
        'log_rate_analysis',
        seed({}, undefined, {
          origin: { app: 'discover', surface: 'document', documentId: 'doc-1' },
        })
      )
    ).toBe('Single log documents are not a log-volume anchor');
  });
});
