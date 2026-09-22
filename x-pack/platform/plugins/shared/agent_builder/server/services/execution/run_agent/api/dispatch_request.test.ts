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

  it('sends no clone header for a regular kibana call', async () => {
    await dispatch({
      method: 'POST',
      path: '/api/saved_objects/_find',
      body: { type: 'dashboard' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/saved_objects/_find',
      expect.objectContaining({ body: { type: 'dashboard' } })
    );
    expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
  });

  describe('alerting rule creation', () => {
    it('sets the clone header so the rule does not keep the task-scoped credential', async () => {
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

    it('also covers creation with a caller-chosen rule id', async () => {
      await dispatch({
        method: 'POST',
        path: '/api/alerting/rule/some-rule-id',
        body: { name: 'my rule' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/alerting/rule/some-rule-id',
        expect.objectContaining({
          body: { name: 'my rule' },
          headers: { [ALERTING_CLONE_API_KEY_HEADER]: 'true' },
        })
      );
    });

    it('does not touch non-create methods on the rule endpoint', async () => {
      await dispatch({
        method: 'PUT',
        path: '/api/alerting/rule/some-rule-id',
        body: { name: 'renamed' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/alerting/rule/some-rule-id',
        expect.objectContaining({ body: { name: 'renamed' } })
      );
      expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    });

    it('does not touch deeper alerting rule sub-paths', async () => {
      await dispatch({
        method: 'POST',
        path: '/api/alerting/rule/some-rule-id/_update_api_key',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/alerting/rule/some-rule-id/_update_api_key',
        expect.objectContaining({ body: undefined })
      );
      expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    });
  });
});
