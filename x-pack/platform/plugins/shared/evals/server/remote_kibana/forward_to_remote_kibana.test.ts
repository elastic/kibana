/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { httpServerMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import {
  DESTINATION_QUERY_PARAM,
  forwardToRemoteKibana,
  getDestinationFromRequest,
  stripDestinationFromSearchParams,
} from './forward_to_remote_kibana';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('forward_to_remote_kibana', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('extracts destination from request url', () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/internal/evals/datasets',
      query: { [DESTINATION_QUERY_PARAM]: 'remote-1' },
    });

    expect(getDestinationFromRequest(request)).toEqual('remote-1');
  });

  it('strips destination from search params', () => {
    const params = new URLSearchParams({ a: '1', [DESTINATION_QUERY_PARAM]: 'remote-1' });
    const stripped = stripDestinationFromSearchParams(params);

    expect(stripped.get(DESTINATION_QUERY_PARAM)).toBeNull();
    expect(stripped.get('a')).toEqual('1');
  });

  it('forwards to remote Kibana and removes destination from query', async () => {
    const esoStart = encryptedSavedObjectsMock.createStart();
    const esoClient = encryptedSavedObjectsMock.createClient();
    (esoStart.getClient as jest.Mock).mockReturnValue(esoClient);
    (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
      attributes: {
        displayName: 'Remote',
        url: 'https://my-deployment-abc123.kb.us-central1.gcp.cloud.es.io/base',
        apiKey: 'abc123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    mockedFetch.mockResolvedValueOnce({
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ ok: true }),
      text: async () => '',
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/internal/evals/datasets',
      query: { page: 1, per_page: 25, [DESTINATION_QUERY_PARAM]: 'remote-1' },
    });

    const res = await forwardToRemoteKibana({
      encryptedSavedObjects: esoStart,
      remoteId: 'remote-1',
      request,
      method: 'GET',
    });

    expect(res).toEqual({ statusCode: 200, body: { ok: true } });

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://my-deployment-abc123.kb.us-central1.gcp.cloud.es.io/base/internal/evals/datasets?page=1&per_page=25',
      expect.objectContaining({
        method: 'GET',
        body: undefined,
        headers: expect.objectContaining({
          'kbn-xsrf': 'true',
          'x-elastic-internal-origin': 'kibana',
          'content-type': 'application/json',
          Authorization: 'ApiKey abc123',
        }),
      })
    );
  });

  it('sends JSON body for non-GET requests', async () => {
    const esoStart = encryptedSavedObjectsMock.createStart();
    const esoClient = encryptedSavedObjectsMock.createClient();
    (esoStart.getClient as jest.Mock).mockReturnValue(esoClient);
    (esoClient.getDecryptedAsInternalUser as jest.Mock).mockResolvedValueOnce({
      attributes: {
        displayName: 'Remote',
        url: 'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud/',
        apiKey: 'abc123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    mockedFetch.mockResolvedValueOnce({
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ dataset_id: 'x' }),
      text: async () => '',
    } as any);

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/evals/datasets',
      query: { [DESTINATION_QUERY_PARAM]: 'remote-1' },
    });

    await forwardToRemoteKibana({
      encryptedSavedObjects: esoStart,
      remoteId: 'remote-1',
      request,
      method: 'POST',
      body: { name: 'my-dataset' },
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud/internal/evals/datasets',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'my-dataset' }),
      })
    );
  });
});
