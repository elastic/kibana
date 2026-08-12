/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { z } from '@kbn/zod/v4';
import { buildEventId } from '@kbn/connector-specs';

import { computeIngestTokenHash } from './compute_ingest_token_hash';
import { INBOUND_EVENTS_DISABLED_MESSAGE } from './constants';
import { handleInboundRequest } from './handle_inbound_request';

jest.mock('@kbn/connector-specs', () => {
  const actual = jest.requireActual('@kbn/connector-specs');
  return {
    ...actual,
    getConnectorSpec: jest.fn(),
  };
});

import { getConnectorSpec } from '@kbn/connector-specs';

const getConnectorSpecMock = getConnectorSpec as jest.MockedFunction<typeof getConnectorSpec>;

describe('handleInboundRequest', () => {
  const logger = loggingSystemMock.createLogger();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const emitConnectorEvents = jest.fn().mockResolvedValue(undefined);
  const getSpaceId = jest.fn().mockReturnValue('default');

  const connectorId = 'connector-1';
  const token = 'ingest-token-value';
  const ingestTokenHash = computeIngestTokenHash({
    connectorId,
    spaceId: 'default',
    token,
  });

  const createFakeSpec = (handleEvents: jest.Mock) =>
    ({
      metadata: {
        id: '.myConnector',
        displayName: 'My Connector',
        description: 'test',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
      actions: {},
      test: { enabled: false, handler: async () => ({}) },
      events: {
        definitions: {
          received: {
            eventId: buildEventId('.myConnector', 'received'),
            title: 'Received',
            description: 'test',
            eventSchema: z.object({ body: z.unknown() }),
          },
        },
        handleEvents,
      },
    } as ReturnType<typeof getConnectorSpec>);

  beforeEach(() => {
    jest.clearAllMocks();
    getSpaceId.mockReturnValue('default');
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: connectorId,
      type: 'action',
      references: [],
      attributes: {
        actionTypeId: '.myConnector',
        name: 'Test',
        isMissingSecrets: false,
        config: { ingestTokenHash },
        secrets: {},
      },
    });
  });

  const run = async (overrides?: {
    enabled?: boolean;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
  }) => {
    const request = httpServerMock.createKibanaRequest({
      query: overrides?.query ?? { token },
      headers: overrides?.headers ?? {},
      body: { hello: 'world' },
    });
    const response = httpServerMock.createResponseFactory();
    await handleInboundRequest({
      request,
      response,
      typeId: 'myConnector',
      connectorId,
      inboundEventsEnabled: overrides?.enabled ?? true,
      emitConnectorEvents,
      logger,
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [],
      getSpaceId,
    });
    return response;
  };

  it('returns 403 when inbound events are disabled', async () => {
    const res = await run({ enabled: false });
    expect(res.forbidden).toHaveBeenCalledWith({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  it('returns 404 when the spec has no events', async () => {
    getConnectorSpecMock.mockReturnValue(undefined);
    const res = await run();
    expect(res.notFound).toHaveBeenCalled();
  });

  it('returns 404 for a bad token', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn()) as ReturnType<typeof getConnectorSpec>
    );
    const res = await run({ query: { token: 'wrong' } });
    expect(res.notFound).toHaveBeenCalled();
    expect(emitConnectorEvents).not.toHaveBeenCalled();
  });

  it('returns 202 and emits on the happy path', async () => {
    const eventId = buildEventId('.myConnector', 'received');
    const handleEvents = jest.fn().mockResolvedValue({
      type: 'emit',
      events: [
        {
          eventId,
          correlationKey: 'corr-1',
          payload: { body: { hello: 'world' } },
        },
      ],
    });
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(handleEvents) as ReturnType<typeof getConnectorSpec>
    );

    const res = await run();
    expect(res.accepted).toHaveBeenCalledWith({ body: { ok: true } });
    expect(handleEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorId,
        connectorTypeId: '.myConnector',
        spaceId: 'default',
        rawBody: { hello: 'world' },
      })
    );
    expect(emitConnectorEvents).toHaveBeenCalledWith({
      eventId,
      payload: { body: { hello: 'world' } },
      spaceId: 'default',
      connectorId,
      connectorTypeId: '.myConnector',
      correlationKey: 'corr-1',
    });
  });

  it('returns 500 when handleEvents throws', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(jest.fn().mockRejectedValue(new Error('spoke failed'))) as ReturnType<
        typeof getConnectorSpec
      >
    );
    const res = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
  });

  it('returns 500 when emitted events fail validation', async () => {
    getConnectorSpecMock.mockReturnValue(
      createFakeSpec(
        jest.fn().mockResolvedValue({
          type: 'emit',
          events: [
            {
              eventId: 'unknown.event',
              correlationKey: 'corr-1',
              payload: { body: {} },
            },
          ],
        })
      ) as ReturnType<typeof getConnectorSpec>
    );
    const res = await run();
    expect(res.customError).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
    expect(emitConnectorEvents).not.toHaveBeenCalled();
  });
});
