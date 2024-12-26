/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getWellKnownEmailServiceRoute } from './get_well_known_email_service';
import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';

describe('getWellKnownEmailServiceRoute', () => {
  it('returns config for well known email service', async () => {
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/stack_connectors/_email_config/{service}"`
    );

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { service: 'gmail' },
    });
    await handler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
      },
    });
  });

  it('returns config for elastic cloud email service', async () => {
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/stack_connectors/_email_config/{service}"`
    );

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { service: 'elastic_cloud' },
    });

    await handler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        host: 'dockerhost',
        port: 10025,
        secure: false,
      },
    });
  });

  it('returns empty for unknown service', async () => {
    const router = httpServiceMock.createRouter();

    getWellKnownEmailServiceRoute(router);

    const [config, handler] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(
      `"/internal/stack_connectors/_email_config/{service}"`
    );

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest({
      params: { service: 'foo' },
    });
    await handler({}, mockRequest, mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {},
    });
  });
});
