/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';

import type { InMemoryConnector, RawAction } from '../types';
import type { IngestInboundEventInput, IngestInboundEventResult } from './ingest';
import { ingestInboundEvent } from './ingest';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';

/**
 * Internal deps after the factory has bound the SO client factory.
 * Not part of the public inbound surface — use {@link InboundEventsClientArgs} + `createInboundEventsClient`.
 */
interface InboundEventsClientInternalDeps {
  logger: Logger;
  inboundEventsEnabled: boolean;
  isActionTypeEnabled: (actionTypeId: string) => boolean;
  maxEmitted: number;
  maxBodyBytes: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  getUnsecuredSavedObjectsClient: (spaceId: string) => Promise<SavedObjectsClientContract>;
  getDecryptedConnectorAttributes: (connectorId: string, spaceId: string) => Promise<RawAction>;
  inMemoryConnectors: InMemoryConnector[];
}

export interface InboundEventsClient {
  ingest(params: IngestInboundEventInput): Promise<IngestInboundEventResult>;
}

/**
 * Binds resolved inbound deps onto an `ingest` operation.
 */
export function buildInboundEventsClient(
  deps: InboundEventsClientInternalDeps
): InboundEventsClient {
  return {
    ingest: (input) =>
      ingestInboundEvent({
        ...input,
        inboundEventsEnabled: deps.inboundEventsEnabled,
        isActionTypeEnabled: deps.isActionTypeEnabled,
        maxEmitted: deps.maxEmitted,
        maxBodyBytes: deps.maxBodyBytes,
        emitConnectorEvents: deps.emitConnectorEvents,
        logger: deps.logger,
        getUnsecuredSavedObjectsClient: deps.getUnsecuredSavedObjectsClient,
        getDecryptedConnectorAttributes: deps.getDecryptedConnectorAttributes,
        inMemoryConnectors: deps.inMemoryConnectors,
      }),
  };
}
