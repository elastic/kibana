/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../lib/telemetry/es_ui_open_apis', () => ({
  upsertUIOpenOption: jest.fn(),
}));

jest.mock('../lib/telemetry/es_ui_reindex_apis', () => ({
  upsertUIReindexOption: jest.fn(),
}));

import { Server } from 'hapi';
import { upsertUIOpenOption } from '../lib/telemetry/es_ui_open_apis';
import { upsertUIReindexOption } from '../lib/telemetry/es_ui_reindex_apis';
import { registerTelemetryRoutes } from './telemetry';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('Upgrade Assistant Telemetry API', () => {
  const server = new Server();

  registerTelemetryRoutes(server);

  describe('PUT /api/upgrade_assistant/telemetry/ui_open', () => {
    it('returns correct payload with single option', async () => {
      const returnPayload = {
        overview: true,
        cluster: false,
        indices: false,
      };

      upsertUIOpenOption.mockResolvedValue(returnPayload);

      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_open',
        payload: {
          overview: true,
        },
      });

      expect(JSON.parse(resp.payload)).toEqual(returnPayload);
    });

    it('returns correct payload with multiple option', async () => {
      const returnPayload = {
        overview: true,
        cluster: true,
        indices: true,
      };

      upsertUIOpenOption.mockResolvedValue(returnPayload);

      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_open',
        payload: {
          overview: true,
          cluster: true,
          indices: true,
        },
      });

      expect(JSON.parse(resp.payload)).toEqual(returnPayload);
    });

    it('returns an error if it throws', async () => {
      upsertUIOpenOption.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_open',
        payload: {
          overview: false,
        },
      });

      expect(resp.statusCode).toEqual(500);
    });
  });

  describe('PUT /api/upgrade_assistant/telemetry/ui_reindex', () => {
    it('returns correct payload with single option', async () => {
      const returnPayload = {
        close: false,
        open: false,
        start: true,
        stop: false,
      };

      upsertUIReindexOption.mockResolvedValue(returnPayload);

      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_reindex',
        payload: {
          start: true,
        },
      });

      expect(JSON.parse(resp.payload)).toEqual(returnPayload);
    });

    it('returns correct payload with multiple option', async () => {
      const returnPayload = {
        close: true,
        open: true,
        start: true,
        stop: true,
      };

      upsertUIReindexOption.mockResolvedValue(returnPayload);

      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_reindex',
        payload: {
          close: true,
          open: true,
          start: true,
          stop: true,
        },
      });

      expect(JSON.parse(resp.payload)).toEqual(returnPayload);
    });

    it('returns an error if it throws', async () => {
      upsertUIReindexOption.mockRejectedValue(new Error(`scary error!`));
      const resp = await server.inject({
        method: 'PUT',
        url: '/api/upgrade_assistant/telemetry/ui_reindex',
        payload: {
          start: false,
        },
      });

      expect(resp.statusCode).toEqual(500);
    });
  });
});
