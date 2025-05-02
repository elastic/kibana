/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';

import { nextTick } from '@kbn/test-jest-helpers';

import { postConnectorConfiguration } from './update_connector_configuration_api_logic';

describe('updateConnectorConfigurationLogic', () => {
  const http = httpServiceMock.createSetupContract();
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('postConnectorConfiguration', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const configuration = { configurationKey: 'yeahhhh' };
      const result = postConnectorConfiguration({
        http,
        configuration,
        connectorId: 'anIndexId',
      });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/content_connectors/connectors/anIndexId/configuration',
        { body: JSON.stringify(configuration) }
      );
      await expect(result).resolves.toEqual({ configuration: 'result' });
    });
  });
});
