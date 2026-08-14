/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';

import type { InMemoryConnector } from '../types';
import type { InboundEventsRequestQuery, IngestInboundEventResult } from './ingest';
import { ingestInboundEvent } from './ingest';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';

export interface InboundEventsClientArgs {
  logger: Logger;
  inboundEventsEnabled: boolean;
  maxEmitted: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  getStartServices: CoreSetup['getStartServices'];
  inMemoryConnectors: InMemoryConnector[];
}

export interface InboundEventsClient {
  ingest(params: {
    request: KibanaRequest<unknown, InboundEventsRequestQuery, unknown>;
    connectorTypeId: string;
    connectorId: string;
    spaceId: string;
  }): Promise<IngestInboundEventResult>;
}

/**
 * Builds an inbound events client with shared deps (logger, emitter, config flags).
 */
export function createInboundEventsClient(args: InboundEventsClientArgs): InboundEventsClient {
  return {
    ingest: ({ request, connectorTypeId, connectorId, spaceId }) =>
      ingestInboundEvent({
        request,
        connectorTypeId,
        connectorId,
        spaceId,
        inboundEventsEnabled: args.inboundEventsEnabled,
        maxEmitted: args.maxEmitted,
        emitConnectorEvents: args.emitConnectorEvents,
        logger: args.logger,
        getStartServices: args.getStartServices,
        inMemoryConnectors: args.inMemoryConnectors,
      }),
  };
}
