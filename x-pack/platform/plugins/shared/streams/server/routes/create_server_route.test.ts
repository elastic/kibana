/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StatusError } from '../lib/streams/errors/status_error';
import { createServerRoute } from './create_server_route';

describe('createServerRoute', () => {
  it('keeps a 413 from the config distributor instead of surfacing it as 500', async () => {
    const route = createServerRoute({
      endpoint: 'PUT /internal/streams/test',
      security: { authz: { enabled: false, reason: 'test route' } },
      handler: async () => {
        throw new StatusError(
          'Failed to publish Streams unit [default] to config distributor',
          413
        );
      },
    });
    const telemetry = {
      startTrackingEndpointLatency: () => () => {},
      reportStreamsStateError: jest.fn(),
    };

    await expect(
      route['PUT /internal/streams/test'].handler({ telemetry } as unknown as Parameters<
        (typeof route)['PUT /internal/streams/test']['handler']
      >[0])
    ).rejects.toMatchObject({ isBoom: true, output: { statusCode: 413 } });
  });
});
