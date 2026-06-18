/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchRulesByIds } from './fetch_rules_by_ids';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchRulesByIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 1,
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
        perPage: 2,
        page: 1,
      },
    });
  });

  it('chunks ids using MAX_BULK_ITEMS', async () => {
    const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, index) => `rule-${index}`);

    await fetchRulesByIds({ http: mockHttp, ids });

    expect(mockHttp.get).toHaveBeenCalledTimes(2);
    expect(mockHttp.get).toHaveBeenNthCalledWith(1, ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: expect.any(String),
        perPage: MAX_BULK_ITEMS,
        page: 1,
      },
    });
    expect(mockHttp.get).toHaveBeenNthCalledWith(2, ALERTING_V2_RULE_API_PATH, {
      query: {
        filter: expect.any(String),
        perPage: 1,
        page: 1,
      },
    });
  });
});
