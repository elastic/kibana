/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ActionPoliciesApi } from './action_policies_api';

const DATA_FIELDS_PATH = '/api/alerting/v2/action_policies/suggestions/data_fields';

describe('ActionPoliciesApi.fetchDataFields', () => {
  it('calls the data_fields endpoint with matcher=undefined when no matcher is provided', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue([]);
    const api = new ActionPoliciesApi(http);

    await api.fetchDataFields();

    expect(http.get).toHaveBeenCalledWith(DATA_FIELDS_PATH, {
      query: { matcher: undefined },
    });
  });

  it('forwards the matcher as a query parameter', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue([]);
    const api = new ActionPoliciesApi(http);

    await api.fetchDataFields('rule.id : "abc"');

    expect(http.get).toHaveBeenCalledWith(DATA_FIELDS_PATH, {
      query: { matcher: 'rule.id : "abc"' },
    });
  });

  it('treats empty matcher as undefined in the query', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue([]);
    const api = new ActionPoliciesApi(http);

    await api.fetchDataFields('');

    expect(http.get).toHaveBeenCalledWith(DATA_FIELDS_PATH, {
      query: { matcher: undefined },
    });
  });

  it('returns the response payload from the HTTP layer', async () => {
    const http = httpServiceMock.createStartContract();
    http.get.mockResolvedValue(['data.host.name', 'data.count']);
    const api = new ActionPoliciesApi(http);

    const result = await api.fetchDataFields();

    expect(result).toEqual(['data.host.name', 'data.count']);
  });
});
