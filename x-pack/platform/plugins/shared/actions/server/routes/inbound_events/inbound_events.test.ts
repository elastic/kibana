/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Socket } from 'node:net';

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ACTIONS_INBOUND_EVENTS_ENABLED_FLAG } from '../../../common';
import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_DISABLED_MESSAGE,
  INBOUND_EVENTS_SECURITY,
} from '../../inbound/constants';
import type { InboundEventsClient } from '../../inbound/client';
import { mockHandlerArguments } from '../_mock_handler_arguments';
import { inboundEventsRoute } from './inbound_events';

describe('inboundEventsRoute', () => {
  const getSpaceId = jest.fn().mockReturnValue('default');
  const getBooleanValue = jest.fn().mockResolvedValue(true);
  const logger = loggingSystemMock.createLogger();

  const routeContext = () => ({
    core: Promise.resolve({
      featureFlags: { getBooleanValue },
    }),
  });

  const registerRoute = (client: InboundEventsClient) => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    inboundEventsRoute({
      router,
      maxBodyBytes: 1024 * 1024,
      inboundEventsClient: client,
      getSpaceId,
      logger,
    });

    return { router, addVersionMock };
  };

  beforeEach(() => {
    getBooleanValue.mockReset();
    getBooleanValue.mockResolvedValue(true);
    logger.warn.mockClear();
  });

  it('registers a public versioned POST route', () => {
    const ingest = jest.fn();
    const { router, addVersionMock } = registerRoute({ ingest });

    expect(INBOUND_EVENTS_API_PATH).toBe('/api/actions/events/{connector_type_id}/{connector_id}');
    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: INBOUND_EVENTS_API_PATH,
        access: 'public',
        security: INBOUND_EVENTS_SECURITY,
        options: expect.objectContaining({
          xsrfRequired: false,
          tags: ['oas-tag:connectors'],
          availability: {
            since: '9.6.0',
            stability: 'experimental',
          },
          body: expect.objectContaining({
            accepts: [
              'application/json',
              'application/*+json',
              'application/x-www-form-urlencoded',
              'text/plain',
              '*/*',
            ],
            maxBytes: 1024 * 1024,
          }),
        }),
      })
    );

    expect(addVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        version: INBOUND_EVENTS_API_VERSION,
        validate: expect.objectContaining({
          response: expect.objectContaining({
            200: expect.objectContaining({
              description: expect.stringMatching(/plain-text/i),
            }),
            202: expect.anything(),
            403: expect.objectContaining({
              description: 'Inbound connector events are disabled.',
            }),
            404: expect.anything(),
            500: expect.anything(),
          }),
        }),
      }),
      expect.any(Function)
    );
  });

  it('maps accepted ingest results to 202', async () => {
    const ingest = jest.fn().mockResolvedValue({ status: 'accepted', body: { ok: true } });
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
      query: {},
      body: { hello: 'world' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['accepted']);

    await handler(routeContext(), request, res);

    expect(ingest).toHaveBeenCalledWith({
      connectorTypeId: 'webhook',
      connectorId: 'c1',
      spaceId: 'default',
      requestId: request.id,
      headers: request.headers,
      query: request.query,
      body: request.body,
      remoteAddress: request.socket.remoteAddress,
    });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(getBooleanValue).toHaveBeenCalledWith(ACTIONS_INBOUND_EVENTS_ENABLED_FLAG, true);
  });

  it('returns 403 and skips ingest when the feature flag is off', async () => {
    getBooleanValue.mockResolvedValueOnce(false);
    const ingest = jest.fn();
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['forbidden']);

    await handler(routeContext(), request, res);

    expect(getBooleanValue).toHaveBeenCalledWith(ACTIONS_INBOUND_EVENTS_ENABLED_FLAG, true);
    expect(ingest).not.toHaveBeenCalled();
    expect(res.forbidden).toHaveBeenCalledWith({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('outcome=disabled'),
      expect.objectContaining({
        inboundEvents: expect.objectContaining({
          outcome: 'disabled',
          connectorId: 'c1',
          connectorTypeId: 'webhook',
          detail: 'feature_flag',
        }),
      })
    );
  });

  it('forwards Authorization ApiKey and the request space to ingest', async () => {
    const ingest = jest.fn().mockResolvedValue({ status: 'accepted', body: { ok: true } });
    getSpaceId.mockReturnValueOnce('space-a');
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];
    const apiKey = Buffer.from('es-id:es-secret').toString('base64');

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: '.slack2', connector_id: 'elastic-apps-slack' },
      headers: { authorization: `ApiKey ${apiKey}` },
      query: {},
      body: { type: 'event_callback' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['accepted']);

    await handler(routeContext(), request, res);

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorTypeId: '.slack2',
        connectorId: 'elastic-apps-slack',
        spaceId: 'space-a',
        headers: expect.objectContaining({ authorization: `ApiKey ${apiKey}` }),
        body: { type: 'event_callback' },
      })
    );
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
  });

  it('forwards the socket address and ignores X-Forwarded-For', async () => {
    const ingest = jest.fn().mockResolvedValue({ status: 'accepted', body: { ok: true } });
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', { get: () => '203.0.113.8' });

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
      headers: { 'x-forwarded-for': '198.51.100.1' },
      query: {},
      body: { hello: 'world' },
      socket,
    });
    const [, , res] = mockHandlerArguments({}, request, ['accepted']);

    await handler(routeContext(), request, res);

    expect(ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        remoteAddress: '203.0.113.8',
        headers: expect.objectContaining({ 'x-forwarded-for': '198.51.100.1' }),
      })
    );
  });

  it('maps forbidden ingest results to 403', async () => {
    const ingest = jest
      .fn()
      .mockResolvedValue({ status: 'forbidden', body: INBOUND_EVENTS_DISABLED_MESSAGE });
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['forbidden']);

    await handler(routeContext(), request, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
  });

  it('maps a connector HTTP ack onto the status schema for that response', async () => {
    const body = { ok: true };
    const ingest = jest.fn().mockResolvedValue({
      status: 'spoke_http',
      statusCode: 202,
      body,
    });
    const { addVersionMock } = registerRoute({ ingest });
    const [options, handler] = addVersionMock.mock.calls[0];
    const bodySchema = options.validate.response[202].body();

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
      query: {},
      body: { hello: 'world' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['custom']);

    await handler(routeContext(), request, res);

    expect(res.custom).toHaveBeenCalledWith({ statusCode: 202, body });
    expect(bodySchema.validate(jest.mocked(res.custom).mock.calls[0][0].body)).toEqual(body);
    expect(() => bodySchema.validate(undefined)).toThrow();
  });

  it('maps not_found ingest results to 404', async () => {
    const ingest = jest.fn().mockResolvedValue({ status: 'not_found' });
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['notFound']);

    await handler(routeContext(), request, res);

    expect(res.notFound).toHaveBeenCalled();
  });
});
