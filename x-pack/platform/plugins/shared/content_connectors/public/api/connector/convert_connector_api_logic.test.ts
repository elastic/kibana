/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { convertConnector } from './convert_connector_api_logic';

describe('ConvertConnectorApilogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('convertConnector', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.put.mockReturnValue(promise);
      const result = convertConnector({ connectorId: 'connectorId1', http });
      await nextTick();
      expect(http.put).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/connectorId1/native',
        { body: JSON.stringify({ is_native: false }) }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
