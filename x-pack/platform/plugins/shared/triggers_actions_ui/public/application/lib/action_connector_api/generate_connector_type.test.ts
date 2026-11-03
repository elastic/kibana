/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { generateConnectorType } from '.';

const http = httpServiceMock.createStartContract();

const connectorType: CreateConnectorTypeRequest = {
  id: 'acme',
  displayName: 'Acme',
  description: 'Talks to Acme',
  config: [{ name: 'baseUrl', type: 'string', required: true }],
  auth: { type: 'bearer' },
  actions: {
    ping: {
      description: 'Ping',
      scope: 'read',
      input: [],
      request: { method: 'GET', url: '{{config.baseUrl}}/ping' },
    },
  },
};

beforeEach(() => jest.resetAllMocks());

describe('generateConnectorType', () => {
  test('posts the documentation URL and returns the draft', async () => {
    const url = 'https://docs.example.com/api';
    http.post.mockResolvedValueOnce({ connectorType });

    const result = await generateConnectorType({ http, url });

    expect(result).toEqual({ connectorType });
    expect(http.post).toHaveBeenCalledWith(
      '/internal/triggers_actions_ui/connector_types/_generate',
      { body: JSON.stringify({ url }) }
    );
  });
});
