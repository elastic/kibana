/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';

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

  const registerRoute = (client: InboundEventsClient) => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    inboundEventsRoute({
      router,
      maxBodyBytes: 1024 * 1024,
      inboundEventsClient: client,
      getSpaceId,
    });

    return { router, addVersionMock };
  };

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
              description: expect.stringMatching(/handshake/i),
            }),
            202: expect.anything(),
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

    await handler({}, request, res);

    expect(ingest).toHaveBeenCalledWith({
      connectorTypeId: 'webhook',
      connectorId: 'c1',
      spaceId: 'default',
      requestId: request.id,
      headers: request.headers,
      query: request.query,
      body: request.body,
    });
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
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

    await handler({}, request, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
  });

  it('maps not_found ingest results to 404', async () => {
    const ingest = jest.fn().mockResolvedValue({ status: 'not_found' });
    const { addVersionMock } = registerRoute({ ingest });
    const handler = addVersionMock.mock.calls[0][1];

    const request = httpServerMock.createKibanaRequest({
      params: { connector_type_id: 'webhook', connector_id: 'c1' },
    });
    const [, , res] = mockHandlerArguments({}, request, ['notFound']);

    await handler({}, request, res);

    expect(res.notFound).toHaveBeenCalled();
  });
});
