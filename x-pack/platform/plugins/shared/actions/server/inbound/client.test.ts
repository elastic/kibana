/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { buildInboundEventsClient } from './client';
import { ingestInboundEvent } from './ingest';
import { InboundEventRateLimiter } from './inbound_event_rate_limiter';

jest.mock('./ingest', () => ({
  ingestInboundEvent: jest.fn(),
}));

const ingestInboundEventMock = ingestInboundEvent as jest.MockedFunction<typeof ingestInboundEvent>;

describe('buildInboundEventsClient', () => {
  it('passes the shared rate limiter into ingest', async () => {
    const rateLimiter = new InboundEventRateLimiter({
      enabled: false,
      maxKeys: 10_000,
      remoteAddress: { limit: 10, windowMs: 60_000 },
      connector: { limit: 300, windowMs: 60_000 },
    });
    ingestInboundEventMock.mockResolvedValue({ status: 'not_found' });

    const client = buildInboundEventsClient({
      logger: loggingSystemMock.createLogger(),
      inboundEventsEnabled: true,
      isActionTypeEnabled: () => true,
      maxEmitted: 25,
      maxBodyBytes: 1024,
      emitConnectorEvents: jest.fn(),
      getUnsecuredSavedObjectsClient: jest.fn(),
      getDecryptedConnectorAttributes: jest.fn(),
      getElasticsearchClient: jest.fn(),
      getKibanaRequestAccess: jest.fn(),
      inMemoryConnectors: [],
      rateLimiter,
    });

    await client.ingest({
      connectorTypeId: '.slack',
      connectorId: 'c1',
      spaceId: 'default',
      headers: {},
      query: {},
      body: {},
      remoteAddress: '203.0.113.5',
    });

    expect(ingestInboundEventMock).toHaveBeenCalledWith(expect.objectContaining({ rateLimiter }));
  });
});
