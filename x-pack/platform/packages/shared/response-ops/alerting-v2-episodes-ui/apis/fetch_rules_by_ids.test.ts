/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODES_LIST_PAGE_SIZE, RULES_RESOLUTION_BATCH_SIZE } from '../constants';
import { fetchRulesByIds } from './fetch_rules_by_ids';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchRulesByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: RULES_RESOLUTION_BATCH_SIZE,
    });
  });

  it('returns an empty array when no ids are provided', async () => {
    await expect(fetchRulesByIds({ http: mockHttp, ids: [] })).resolves.toEqual([]);
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('fetches rules with a KQL id filter in a single request', async () => {
    await fetchRulesByIds({ http: mockHttp, ids: ['rule-a', 'rule-b'] });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    expect(mockHttp.get).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: '(id: "rule-a" OR id: "rule-b")',
        per_page: RULES_RESOLUTION_BATCH_SIZE,
        page: 1,
      },
    });
  });

  it('splits ids into requests of at most RULES_RESOLUTION_BATCH_SIZE', async () => {
    const ids = Array.from(
      { length: RULES_RESOLUTION_BATCH_SIZE + 1 },
      (_, index) => `rule-${index}`
    );

    await fetchRulesByIds({ http: mockHttp, ids });

    expect(mockHttp.get).toHaveBeenCalledTimes(2);
    expect(mockHttp.get).toHaveBeenLastCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: `id: "rule-${RULES_RESOLUTION_BATCH_SIZE}"`,
        per_page: RULES_RESOLUTION_BATCH_SIZE,
        page: 1,
      },
    });
  });

  it('merges the items returned by every batch', async () => {
    const ids = Array.from(
      { length: RULES_RESOLUTION_BATCH_SIZE + 1 },
      (_, index) => `rule-${index}`
    );
    mockHttp.get
      .mockResolvedValueOnce({ items: [{ id: 'rule-0' }], total: 1, page: 1, per_page: 100 })
      .mockResolvedValueOnce({
        items: [{ id: `rule-${RULES_RESOLUTION_BATCH_SIZE}` }],
        total: 1,
        page: 1,
        per_page: 100,
      });

    await expect(fetchRulesByIds({ http: mockHttp, ids })).resolves.toEqual([
      { id: 'rule-0' },
      { id: `rule-${RULES_RESOLUTION_BATCH_SIZE}` },
    ]);
  });

  it('caps ids at ALERT_EPISODES_LIST_PAGE_SIZE', async () => {
    const ids = Array.from(
      { length: ALERT_EPISODES_LIST_PAGE_SIZE + 1 },
      (_, index) => `rule-${index}`
    );

    await fetchRulesByIds({ http: mockHttp, ids });

    expect(mockHttp.get).toHaveBeenCalledTimes(
      ALERT_EPISODES_LIST_PAGE_SIZE / RULES_RESOLUTION_BATCH_SIZE
    );
    expect(mockHttp.get).not.toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: expect.objectContaining({
        filter: expect.stringContaining(`rule-${ALERT_EPISODES_LIST_PAGE_SIZE}"`),
      }),
    });
  });

  it('returns only the rules resolved by the v2 API', async () => {
    const v2Rule = { id: 'v2-rule', metadata: { name: 'V2 Rule' } };
    mockHttp.get.mockResolvedValueOnce({ items: [v2Rule], total: 1, page: 1, per_page: 50 });

    const result = await fetchRulesByIds({ http: mockHttp, ids: ['v2-rule', 'unknown-rule'] });

    expect(result).toEqual([v2Rule]);
    expect(mockHttp.post).not.toHaveBeenCalled();
  });
});
