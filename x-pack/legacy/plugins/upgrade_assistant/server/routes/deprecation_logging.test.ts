/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

jest.mock('../lib/es_version_precheck');
import { registerDeprecationLoggingRoutes } from './deprecation_logging';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_deprecation_logging_apis test.
 */
describe('deprecation logging API', () => {
  const callWithRequest = jest.fn();
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest } as any),
    } as any,
  } as any;

  registerDeprecationLoggingRoutes(server);

  describe('GET /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      callWithRequest.mockResolvedValue({ default: { logger: { deprecation: 'WARN' } } });
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/deprecation_logging',
      });

      expect(resp.statusCode).toEqual(200);
      expect(JSON.parse(resp.payload)).toEqual({ isEnabled: true });
    });

    it('returns an error if it throws', async () => {
      callWithRequest.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/deprecation_logging',
      });

      expect(resp.statusCode).toEqual(500);
    });
  });

  describe('PUT /api/upgrade_assistant/deprecation_logging', () => {
    it('returns isEnabled', async () => {
      callWithRequest.mockResolvedValue({ default: { logger: { deprecation: 'ERROR' } } });
      const resp = await server.inject({
        method: 'GET',
        url: '/api/upgrade_assistant/deprecation_logging',
        payload: {
          isEnabled: false,
        },
      });

      expect(JSON.parse(resp.payload)).toEqual({ isEnabled: false });
    });

    it('returns an error if it throws', async () => {
      callWithRequest.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/deprecation_logging',
        payload: {
          isEnabled: false,
        },
      });

      expect(resp.statusCode).toEqual(500);
    });
  });
});
