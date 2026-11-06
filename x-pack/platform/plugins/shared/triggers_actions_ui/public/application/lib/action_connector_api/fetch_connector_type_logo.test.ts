/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchConnectorTypeLogo } from './fetch_connector_type_logo';

const http = httpServiceMock.createStartContract();

describe('fetchConnectorTypeLogo', () => {
  it('posts the URL to the internal logo route and returns the data URI', async () => {
    http.post.mockResolvedValueOnce({ icon: 'data:image/png;base64,AAAA' });

    await expect(
      fetchConnectorTypeLogo({ http, url: 'https://cdn.example.com/logo.png' })
    ).resolves.toEqual({ icon: 'data:image/png;base64,AAAA' });
    expect(http.post).toHaveBeenCalledWith('/internal/triggers_actions_ui/connector_types/_logo', {
      body: JSON.stringify({ url: 'https://cdn.example.com/logo.png' }),
    });
  });
});
