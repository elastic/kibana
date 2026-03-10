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
  it('calls the check availability endpoint with the correct parameters', async () => {
    http.get.mockResolvedValueOnce({ connectorIdAvailable: true });

    const result = await checkConnectorIdAvailability({ http, id: 'my-connector-id' });

    expect(http.get).toHaveBeenCalledWith(
      '/api/actions/connector/my-connector-id/_check_availability'
    );
    expect(result).toEqual({ connectorIdAvailable: true });
  });

  it('properly encodes special characters in the id', async () => {
    http.get.mockResolvedValueOnce({ connectorIdAvailable: false });

    await checkConnectorIdAvailability({ http, id: 'my connector/id' });

    expect(http.get).toHaveBeenCalledWith(
      '/api/actions/connector/my%20connector%2Fid/_check_availability'
    );
  });

  it('returns connectorIdAvailable: false when connector exists', async () => {
    http.get.mockResolvedValueOnce({ connectorIdAvailable: false });

    const result = await checkConnectorIdAvailability({ http, id: 'existing-id' });

    expect(result.connectorIdAvailable).toBe(false);
  });
});
