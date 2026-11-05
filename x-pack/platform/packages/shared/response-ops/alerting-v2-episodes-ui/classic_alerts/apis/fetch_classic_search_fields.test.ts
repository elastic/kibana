/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { fetchClassicSearchFields } from './fetch_classic_search_fields';

const mockHttp = httpServiceMock.createStartContract();

describe('fetchClassicSearchFields', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns browser fields in the autocomplete field shape', async () => {
    mockHttp.get.mockResolvedValue({
      fields: [
        {
          name: 'kibana.alert.rule.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: false,
        },
      ],
    });
    const abortController = new AbortController();

    const fields = await fetchClassicSearchFields({
      ruleTypeIds: ['.es-query'],
      services: { http: mockHttp },
      abortSignal: abortController.signal,
    });

    expect(fields).toEqual([
      {
        name: 'kibana.alert.rule.name',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: false,
      },
    ]);
    expect(mockHttp.get).toHaveBeenCalledWith(`${BASE_RAC_ALERTS_API_PATH}/browser_fields`, {
      query: { ruleTypeIds: ['.es-query'] },
      signal: abortController.signal,
    });
  });
});
