/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createHealthRoute } from './health';

const BASE_ROUTE = '/internal/triggers_actions_ui';

describe('createHealthRoute', () => {
  it('registers the route at the correct path', () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    createHealthRoute(logger, router, BASE_ROUTE, true);

    const [config] = router.get.mock.calls[0];
    expect(config.path).toMatchInlineSnapshot(`"/internal/triggers_actions_ui/_health"`);
  });

  it('returns isAlertsAvailable and skipped preconfigured connector ids from actions context', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    createHealthRoute(logger, router, BASE_ROUTE, true);

    const [, handler] = router.get.mock.calls[0];
    const skippedIds = new Set(['connector-a', 'connector-b']);
    const context = {
      actions: Promise.resolve({
        getSkippedPreconfiguredConnectorIds: () => skippedIds,
      }),
    };

    const mockResponse = httpServerMock.createResponseFactory();
    await handler(context, httpServerMock.createKibanaRequest(), mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        isAlertsAvailable: true,
        skippedPreconfiguredConnectorIds: ['connector-a', 'connector-b'],
      },
    });
  });

  it('returns empty skippedPreconfiguredConnectorIds when none are skipped', async () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.create().get();

    createHealthRoute(logger, router, BASE_ROUTE, false);

    const [, handler] = router.get.mock.calls[0];
    const context = {
      actions: Promise.resolve({
        getSkippedPreconfiguredConnectorIds: () => new Set<string>(),
      }),
    };

    const mockResponse = httpServerMock.createResponseFactory();
    await handler(context, httpServerMock.createKibanaRequest(), mockResponse);

    expect(mockResponse.ok).toHaveBeenCalledWith({
      body: {
        isAlertsAvailable: false,
        skippedPreconfiguredConnectorIds: [],
      },
    });
  });
});
