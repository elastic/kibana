/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  getConnectorSpec,
  normalizeConnectorTypeId,
  validateEmittedEvents,
} from '@kbn/connector-specs';

import type { InMemoryConnector } from '../types';
import {
  INBOUND_EVENTS_DISABLED_MESSAGE,
  INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
} from './constants';
import { loadInboundConnector } from './load_inbound_connector';
import type { ConnectorEventEmitParams } from './types';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';

export interface HandleInboundRequestParams {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  typeId: string;
  connectorId: string;
  inboundEventsEnabled: boolean;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<void>;
  logger: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  inMemoryConnectors: InMemoryConnector[];
  getSpaceId: (request: KibanaRequest) => string;
}

export async function handleInboundRequest({
  request,
  response,
  typeId,
  connectorId,
  inboundEventsEnabled,
  emitConnectorEvents,
  logger,
  unsecuredSavedObjectsClient,
  inMemoryConnectors,
  getSpaceId,
}: HandleInboundRequestParams) {
  if (!inboundEventsEnabled) {
    return response.forbidden({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
  }

  const connectorTypeId = normalizeConnectorTypeId(typeId);
  const spec = getConnectorSpec(connectorTypeId);
  if (!spec?.events) {
    return response.notFound();
  }

  const spaceId = getSpaceId(request);
  const connector = await loadInboundConnector({
    connectorId,
    connectorTypeId,
    spaceId,
    unsecuredSavedObjectsClient,
    inMemoryConnectors,
    logger,
  });
  if (!connector) {
    return response.notFound();
  }

  const ingestTokenHash =
    typeof connector.config.ingestTokenHash === 'string'
      ? connector.config.ingestTokenHash
      : undefined;
  if (typeof ingestTokenHash !== 'string' || ingestTokenHash.length === 0) {
    return response.notFound();
  }

  const providedToken = extractIngestToken({
    query: request.query as Record<string, unknown>,
    headers: request.headers,
  });
  if (
    !providedToken ||
    !verifyIngestToken({
      connectorId,
      spaceId,
      providedToken,
      ingestTokenHash,
    })
  ) {
    return response.notFound();
  }

  try {
    const result = await spec.events.handleEvents({
      connectorId,
      connectorTypeId,
      spaceId,
      config: connector.config,
      rawBody: request.body,
      log: logger,
    });

    const validation = validateEmittedEvents(spec.events.definitions, result.events);
    if (!validation.ok) {
      logger.error(
        `Inbound connector ${connectorId} emitted invalid events: ${JSON.stringify(
          validation.errors
        )}`
      );
      return response.customError({
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      });
    }

    for (const event of result.events) {
      try {
        await emitConnectorEvents({
          eventId: event.eventId,
          payload: event.payload,
          spaceId,
          connectorId,
          connectorTypeId,
          correlationKey: event.correlationKey,
        });
      } catch (error) {
        // Emitter failures must not fail the HTTP response (still 202).
        logger.warn(
          `Inbound connector ${connectorId} event emitter failed for ${event.eventId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return response.accepted({ body: { ok: true } });
  } catch (error) {
    logger.error(
      `Inbound connector ${connectorId} handleEvents failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return response.customError({
      statusCode: 500,
      body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
    });
  }
}
