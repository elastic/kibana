/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVisibleSearchSource, DOT_INDEX_ALLOW_LIST_PATTERNS } from './dot_index_allow_list';

describe('isVisibleSearchSource', () => {
  describe('non-dot names', () => {
    it.each([
      ['my-index'],
      ['logs-*'],
      ['metrics-apm.transaction.1m-default'],
      ['traces-apm-default'],
      ['foo.bar'],
    ])('allows %p (does not start with a dot)', (name) => {
      expect(isVisibleSearchSource(name)).toBe(true);
    });
  });

  describe('on-list dot-prefixed names', () => {
    it.each([
      // `.alerts-*` - rule registry alerts.
      ['.alerts-security.alerts-default'],
      ['.alerts-observability.logs.alerts-default'],
      ['.alerts-observability.apm.alerts-default'],
      ['.alerts-stack.alerts-default'],
      ['.alerts-streams.alerts-default'],
      // `.ml-anomalies-*`.
      ['.ml-anomalies-shared'],
      ['.ml-anomalies-my_custom_job'],
      // `.slo-observability.*`.
      ['.slo-observability.sli-v3.5.0-default'],
      ['.slo-observability.summary-v3.5.0-default'],
      ['.slo-observability.health-v1-default'],
      // `.entities.*`.
      ['.entities.v1.latest.security_user_default'],
      ['.entities.v2.updates.host_default'],
      // `.lists` / `.items` literal and space-suffixed.
      ['.lists'],
      ['.items'],
      ['.lists-default'],
      ['.items-default'],
      // `.siem-signals-*`.
      ['.siem-signals-default'],
      // `.monitoring-*`.
      ['.monitoring-es-8-mb-2024.01.01'],
      ['.monitoring-kibana-8-2024.01.01'],
    ])('allows %p', (name) => {
      expect(isVisibleSearchSource(name)).toBe(true);
    });
  });

  describe('off-list dot-prefixed names', () => {
    it.each([
      ['.kibana_8.15.0'],
      ['.kibana_task_manager_8.15.0_001'],
      ['.fleet-actions'],
      ['.fleet-policies'],
      ['.chat-conversations'],
      // Internal backing indices for alerts should stay hidden; the user-facing
      // alias is what we expose.
      ['.internal.alerts-security.alerts-default-000001'],
      ['.tasks'],
      ['.reporting-2024-01-01'],
      ['.security-7'],
      ['.apm-agent-configuration'],
      ['.transform-notifications-000002'],
    ])('rejects %p', (name) => {
      expect(isVisibleSearchSource(name)).toBe(false);
    });
  });

  describe('cross-cluster search names', () => {
    it('allows an on-list local segment on a remote cluster', () => {
      expect(isVisibleSearchSource('cluster_a:.alerts-security.alerts-default')).toBe(true);
    });

    it('rejects an off-list local segment on a remote cluster', () => {
      expect(isVisibleSearchSource('cluster_a:.kibana_8.15.0')).toBe(false);
    });

    it('allows a non-dot local segment on a remote cluster', () => {
      expect(isVisibleSearchSource('cluster_a:logs-*')).toBe(true);
    });

    it('splits on the last `:` so nested colons do not break matching', () => {
      expect(isVisibleSearchSource('cluster:a:.alerts-security.alerts-default')).toBe(true);
    });
  });

  describe('malformed input', () => {
    it('rejects an empty string without throwing', () => {
      expect(isVisibleSearchSource('')).toBe(false);
    });

    it('rejects a value whose local segment is empty', () => {
      expect(isVisibleSearchSource('cluster_a:')).toBe(false);
    });

    // Accepts anything callable safely - we guard against non-string inputs
    // from untyped callers like route handlers that forward untrusted data.
    it.each([
      [undefined as unknown as string],
      [null as unknown as string],
      [42 as unknown as string],
      [{} as unknown as string],
    ])('rejects non-string %p without throwing', (input) => {
      expect(() => isVisibleSearchSource(input)).not.toThrow();
      expect(isVisibleSearchSource(input)).toBe(false);
    });
  });

  it('exports at least one pattern for every documented category', () => {
    const patterns = DOT_INDEX_ALLOW_LIST_PATTERNS.join(',');
    expect(patterns).toContain('.alerts-*');
    expect(patterns).toContain('.ml-anomalies-*');
    expect(patterns).toContain('.slo-observability.*');
    expect(patterns).toContain('.entities.*');
    expect(patterns).toContain('.siem-signals-*');
    expect(patterns).toContain('.monitoring-*');
  });
});
