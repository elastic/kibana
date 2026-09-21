/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchClassicAlertsKpis } from './fetch_classic_kpis';

const mockHttp = httpServiceMock.createStartContract();

const TEST_RULE_TYPE_IDS = ['observability.rules.custom_threshold', '.es-query'];

describe('fetchClassicAlertsKpis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns KPI counts from aggregations', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { total: { value: 42 }, hits: [] },
      aggregations: {
        firing_rules: { doc_count: 5, rules: { value: 3 } },
        acknowledged: { doc_count: 7 },
        muted: { doc_count: 2 },
        snoozed: { doc_count: 1 },
      },
    });

    const kpis = await fetchClassicAlertsKpis({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    expect(kpis.alerts_count).toBe(42);
    expect(kpis.firing_rules).toBe(3);
    expect(kpis.acknowledged).toBe(7);
    expect(kpis.snoozed).toBe(3); // muted + snoozed
  });

  it('handles missing aggregations gracefully', async () => {
    mockHttp.post.mockResolvedValue({
      hits: { total: 0, hits: [] },
    });

    const kpis = await fetchClassicAlertsKpis({
      ruleTypeIds: TEST_RULE_TYPE_IDS,
      services: { http: mockHttp },
    });

    expect(kpis.alerts_count).toBe(0);
    expect(kpis.firing_rules).toBe(0);
    expect(kpis.acknowledged).toBe(0);
    expect(kpis.snoozed).toBe(0);
  });
});
