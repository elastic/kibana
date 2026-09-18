/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { upgradeActionConnector } from './upgrade';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('upgradeActionConnector', () => {
  test('posts the target version and maps the connector response', async () => {
    http.post.mockResolvedValueOnce({
      id: 'c1',
      name: 'Pinned',
      config: {},
      connector_type_id: '.abuseipdb',
      is_preconfigured: false,
      is_deprecated: false,
      is_system_action: false,
      is_connector_type_deprecated: false,
      auth_mode: 'shared',
      spec_version: '1.1.0',
    });

    const result = await upgradeActionConnector({ http, id: 'c1', specVersion: '1.1.0' });

    expect(http.post).toHaveBeenCalledWith('/api/actions/connector/c1/_upgrade', {
      body: JSON.stringify({ spec_version: '1.1.0' }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'c1',
        actionTypeId: '.abuseipdb',
        specVersion: '1.1.0',
        authMode: 'shared',
      })
    );
  });
});
