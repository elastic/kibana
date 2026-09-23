/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTING_V2_RULE_API_PATH } from '@kbn/alerting-v2-constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { fetchRulesSearch } from './fetch_rules_search';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchRulesSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      per_page: 50,
    });
  });

  it('returns an empty array when no ids are provided', async () => {
    await expect(fetchRulesSearch({ http: mockHttp, query: '' })).resolves.toEqual([]);
    expect(mockHttp.get).not.toHaveBeenCalled();
  });

  it('fetches rules with a KQL filter', async () => {
    await fetchRulesSearch({ http: mockHttp, query: 'rule-a OR rule-b' });

    expect(mockHttp.get).toHaveBeenCalledWith(ALERTING_V2_RULE_API_PATH, {
      query: {
        search: 'rule-a OR rule-b',
        per_page: 50,
        page: 1,
      },
    });
  });
});
