/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import type { HttpSelfService } from '@kbn/core-http-server';
import { ALERTING_CLONE_API_KEY_HEADER } from '@kbn/alerting-plugin/common';
import { dispatchApiRequest } from './dispatch_request';
import type { ApiRequest } from './types';

describe('dispatchApiRequest', () => {
  const fetchMock = jest.fn();
  const selfClient = {
    asScoped: jest.fn().mockReturnValue({ fetch: fetchMock }),
  } as unknown as HttpSelfService;
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  const request = httpServerMock.createKibanaRequest();

  const dispatch = (apiRequest: ApiRequest) =>
    dispatchApiRequest({ target: 'kibana', apiRequest, esClient, selfClient, request });

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true });
  });

  describe('borrowed-key declaration', () => {
    it('declares the borrowed task credential on every self-call', async () => {
      await dispatch({
        method: 'POST',
        path: '/api/alerting/rule',
        body: { name: 'my rule', rule_type_id: '.es-query' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/alerting/rule',
        expect.objectContaining({
          body: { name: 'my rule', rule_type_id: '.es-query' },
          headers: { [ALERTING_CLONE_API_KEY_HEADER]: 'true' },
        })
      );
    });

    it('also declares it on calls that never consult it', async () => {
      await dispatch({
        method: 'GET',
        path: '/api/saved_objects/_find',
        querystring: { type: 'dashboard' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/saved_objects/_find',
        expect.objectContaining({
          headers: { [ALERTING_CLONE_API_KEY_HEADER]: 'true' },
        })
      );
    });
  });
});
