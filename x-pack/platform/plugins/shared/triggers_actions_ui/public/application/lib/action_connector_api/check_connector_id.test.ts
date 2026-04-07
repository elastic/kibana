/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { checkConnectorIdAvailability } from './check_connector_id';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('checkConnectorIdAvailability', () => {
  it('calls HEAD on the get connector path with the correct parameters', async () => {
    http.head.mockResolvedValueOnce({});

    const result = await checkConnectorIdAvailability({ http, id: 'my-connector-id' });

    expect(http.head).toHaveBeenCalledWith('/api/actions/connector/my-connector-id', {
      asResponse: true,
      rawResponse: true,
    });
    expect(result).toEqual({ isAvailable: false });
  });

  it('properly encodes special characters in the id', async () => {
    http.head.mockResolvedValueOnce({});

    await checkConnectorIdAvailability({ http, id: 'my connector/id' });

    expect(http.head).toHaveBeenCalledWith('/api/actions/connector/my%20connector%2Fid', {
      asResponse: true,
      rawResponse: true,
    });
  });

  it('returns isAvailable: true when connector does not exist (404)', async () => {
    const notFoundError = Object.assign(new Error('Not Found'), {
      name: 'Error',
      request: new Request('http://localhost/api/actions/connector/missing'),
      response: new Response('', { status: 404 }),
    });
    http.head.mockRejectedValueOnce(notFoundError);

    const result = await checkConnectorIdAvailability({ http, id: 'new-id' });

    expect(result).toEqual({ isAvailable: true });
  });

  it('returns isAvailable: false when connector exists (200)', async () => {
    http.head.mockResolvedValueOnce({});

    const result = await checkConnectorIdAvailability({ http, id: 'existing-id' });

    expect(result.isAvailable).toBe(false);
  });

  it('rethrows non-404 errors', async () => {
    const serverError = Object.assign(new Error('Server Error'), {
      name: 'Error',
      request: new Request('http://localhost/api/actions/connector/any-id'),
      response: new Response('', { status: 500 }),
    });
    http.head.mockRejectedValueOnce(serverError);

    await expect(checkConnectorIdAvailability({ http, id: 'any-id' })).rejects.toBe(serverError);
  });
});
