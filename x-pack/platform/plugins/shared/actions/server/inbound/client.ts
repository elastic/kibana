/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { IngestEventsRequestQuery } from '../../common/routes/events/apis/ingest';
import type { InMemoryConnector } from '../types';
import type { IngestInboundEventResult } from './ingest';
import { ingestInboundEvent } from './ingest';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';

/**
 * Internal deps after the factory has bound the SO client factory.
 * Not part of the public inbound surface — use {@link InboundEventsClientArgs} + `createInboundEventsClient`.
 */
interface InboundEventsClientInternalDeps {
  logger: Logger;
  inboundEventsEnabled: boolean;
  maxEmitted: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  getUnsecuredSavedObjectsClient: (spaceId: string) => Promise<SavedObjectsClientContract>;
  inMemoryConnectors: InMemoryConnector[];
}

export interface InboundEventsClient {
  ingest(params: {
    request: KibanaRequest<unknown, IngestEventsRequestQuery, unknown>;
    connectorTypeId: string;
    connectorId: string;
    spaceId: string;
  }): Promise<IngestInboundEventResult>;
}

/**
 * Binds resolved inbound deps onto an `ingest` operation.
 */
export function buildInboundEventsClient(
  deps: InboundEventsClientInternalDeps
): InboundEventsClient {
  return {
    ingest: ({ request, connectorTypeId, connectorId, spaceId }) =>
      ingestInboundEvent({
        request,
        connectorTypeId,
        connectorId,
        spaceId,
        inboundEventsEnabled: deps.inboundEventsEnabled,
        maxEmitted: deps.maxEmitted,
        emitConnectorEvents: deps.emitConnectorEvents,
        logger: deps.logger,
        getUnsecuredSavedObjectsClient: deps.getUnsecuredSavedObjectsClient,
        inMemoryConnectors: deps.inMemoryConnectors,
      }),
  };
}
