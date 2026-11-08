/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { findRulesRequestSchema, MAX_KQL_LENGTH } from '@kbn/alerting-v2-schemas';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '../constants';
import { fetchRulesByIds } from './fetch_rules_by_ids';

const mockHttp = httpServiceMock.createStartContract();
const getFindRulesRequests = () =>
  mockHttp.get.mock.calls.map((call) => findRulesRequestSchema.parse(call.at(1)?.query));

describe('fetchRulesByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: ALERT_EPISODES_LIST_PAGE_SIZE,
    });
  });

  it('returns an empty array when no ids are provided', async () => {
    await expect(fetchRulesByIds({ http: mockHttp, ids: [] })).resolves.toEqual([]);
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('fetches rules with a KQL id filter and a per-page size matching the batch', async () => {
    await fetchRulesByIds({ http: mockHttp, ids: ['rule-a', 'rule-b'] });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    expect(mockHttp.get).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: '(id: "rule-a" OR id: "rule-b")',
        per_page: 2,
        page: 1,
      },
    });
  });

  it('splits ids so every KQL filter stays within the API length limit', async () => {
    const ids = Array.from(
      { length: 100 },
      (_, index) => `rule-${index}-${'x'.repeat(20 + (index % 5) * 20)}`
    );

    await fetchRulesByIds({ http: mockHttp, ids });

    expect(mockHttp.get.mock.calls.length).toBeGreaterThan(1);
    for (const request of getFindRulesRequests()) {
      expect(request.filter?.length).toBeLessThanOrEqual(MAX_KQL_LENGTH);
    }
  });

  it('merges the rules returned by every filter-length batch', async () => {
    const ids = Array.from({ length: 100 }, (_, index) => `rule-${index}-${'x'.repeat(50)}`);
    mockHttp.get
      .mockResolvedValueOnce({ items: [{ id: ids[0] }], total: 1, page: 1, per_page: 1 })
      .mockResolvedValueOnce({ items: [{ id: ids[99] }], total: 1, page: 1, per_page: 1 });

    await expect(fetchRulesByIds({ http: mockHttp, ids })).resolves.toEqual([
      { id: ids[0] },
      { id: ids[99] },
    ]);
  });

  it('caps ids at ALERT_EPISODES_LIST_PAGE_SIZE', async () => {
    const ids = Array.from(
      { length: ALERT_EPISODES_LIST_PAGE_SIZE + 1 },
      (_, index) => `rule-${index}`
    );

    await fetchRulesByIds({ http: mockHttp, ids });

    const requests = getFindRulesRequests();
    expect(requests.reduce((total, request) => total + (request.per_page ?? 0), 0)).toBe(
      ALERT_EPISODES_LIST_PAGE_SIZE
    );
    for (const request of requests) {
      expect(request.filter).not.toContain(`id: "rule-${ALERT_EPISODES_LIST_PAGE_SIZE}"`);
    }
  });

  it('returns only the rules resolved by the v2 API', async () => {
    const v2Rule = { id: 'v2-rule', metadata: { name: 'V2 Rule' } };
    mockHttp.get.mockResolvedValueOnce({ items: [v2Rule], total: 1, page: 1, per_page: 50 });

    const result = await fetchRulesByIds({ http: mockHttp, ids: ['v2-rule', 'unknown-rule'] });

    expect(result).toEqual([v2Rule]);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });
});
