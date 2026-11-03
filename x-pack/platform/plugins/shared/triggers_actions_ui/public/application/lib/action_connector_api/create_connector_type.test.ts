/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { createConnectorType } from '.';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('createConnectorType', () => {
  test('should call the create connector type API', async () => {
    http.post.mockResolvedValueOnce({ id: '.my-type' });

    const connectorType: CreateConnectorTypeRequest = {
      id: '.my-type',
      displayName: 'My type',
      description: 'A custom connector type',
      config: [{ name: 'baseUrl', type: 'string', required: true }],
      auth: { type: 'bearer' },
      actions: {
        ping: {
          description: 'Ping the service',
          scope: 'read',
          input: [],
          request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
        },
      },
    };

    const result = await createConnectorType({ http, connectorType });

    expect(result).toEqual({ id: '.my-type' });
    expect(http.post).toHaveBeenCalledWith('/api/actions/connector_types', {
      body: JSON.stringify(connectorType),
    });
  });
});
