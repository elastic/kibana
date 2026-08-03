/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '../constants';
import { fetchRulesByIds } from './fetch_rules_by_ids';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchRulesByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: ALERT_EPISODES_LIST_PAGE_SIZE,
    });
  });

  it('returns an empty array when no ids are provided', async () => {
    await expect(fetchRulesByIds({ http: mockHttp, ids: [] })).resolves.toEqual([]);
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('fetches rules with a KQL id filter', async () => {
    await fetchRulesByIds({ http: mockHttp, ids: ['rule-a', 'rule-b'] });

    expect(mockHttp.get).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: '(id: "rule-a" OR id: "rule-b")',
        perPage: ALERT_EPISODES_LIST_PAGE_SIZE,
        page: 1,
      },
    });
  });

  it('caps ids at ALERT_EPISODES_LIST_PAGE_SIZE', async () => {
    const ids = Array.from(
      { length: ALERT_EPISODES_LIST_PAGE_SIZE + 1 },
      (_, index) => `rule-${index}`
    );

    await fetchRulesByIds({ http: mockHttp, ids });

    expect(mockHttp.get).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: expect.not.stringContaining(`rule-${ALERT_EPISODES_LIST_PAGE_SIZE}`),
        perPage: ALERT_EPISODES_LIST_PAGE_SIZE,
        page: 1,
      },
    });
  });

  it('falls back to v1 rules API for IDs not found in v2', async () => {
    const v2Rule = { id: 'v2-rule', metadata: { name: 'V2 Rule' } };
    mockHttp.get
      .mockResolvedValueOnce({ items: [v2Rule], total: 1, page: 1, perPage: 50 })
      .mockResolvedValueOnce({
        data: [{ id: 'v1-rule', name: 'V1 Rule' }],
      });

    const result = await fetchRulesByIds({
      http: mockHttp,
      ids: ['v2-rule', 'v1-rule'],
    });

    expect(mockHttp.get).toHaveBeenCalledTimes(2);
    expect(mockHttp.get).toHaveBeenNthCalledWith(
      2,
      '/api/alerting/rules/_find',
      expect.objectContaining({
        query: expect.objectContaining({
          filter: expect.stringContaining('alert.id: "alert:v1-rule"'),
        }),
      })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(v2Rule);
    expect(result[1]).toMatchObject({ id: 'v1-rule', metadata: { name: 'V1 Rule' } });
  });

  it('skips v1 fallback when all IDs are resolved by v2', async () => {
    const v2Rule = { id: 'r1', metadata: { name: 'Rule' } };
    mockHttp.get.mockResolvedValueOnce({ items: [v2Rule], total: 1, page: 1, perPage: 50 });

    const result = await fetchRulesByIds({ http: mockHttp, ids: ['r1'] });

    expect(mockHttp.get).toHaveBeenCalledTimes(1);
    expect(result).toEqual([v2Rule]);
  });

  it('returns v2 rules only when v1 fallback fails', async () => {
    const v2Rule = { id: 'v2-rule', metadata: { name: 'V2 Rule' } };
    mockHttp.get
      .mockResolvedValueOnce({ items: [v2Rule], total: 1, page: 1, perPage: 50 })
      .mockRejectedValueOnce(new Error('v1 API unavailable'));

    const result = await fetchRulesByIds({
      http: mockHttp,
      ids: ['v2-rule', 'v1-rule'],
    });

    expect(result).toEqual([v2Rule]);
  });
});
