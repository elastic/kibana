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
  MAX_CONNECTOR_TYPE_ID_LENGTH,
  normalizeConnectorTypeId,
  validateEmittedEvents,
} from '@kbn/connector-specs';

import type { InMemoryConnector } from '../types';
import {
  INBOUND_EVENTS_DISABLED_MESSAGE,
  INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
} from './constants';
import { loadInboundConnector } from './load_inbound_connector';
import { logInboundIngressOutcome } from './log_inbound_ingress_outcome';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';

export interface InboundEventsRequestQuery {
  token?: string;
}

export interface HandleInboundRequestParams {
  request: KibanaRequest<unknown, InboundEventsRequestQuery, unknown>;
  response: KibanaResponseFactory;
  typeId: string;
  connectorId: string;
  spaceId: string;
  inboundEventsEnabled: boolean;
  maxEmittedEvents: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  logger: Logger;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  inMemoryConnectors: InMemoryConnector[];
}

const stripIngestTokenHash = (config: Record<string, unknown>): Record<string, unknown> => {
  const { ingestTokenHash: _omit, ...spokeConfig } = config;
  return spokeConfig;
};

export async function handleInboundRequest({
  request,
  response,
  typeId,
  connectorId,
  spaceId,
  inboundEventsEnabled,
  maxEmittedEvents,
  emitConnectorEvents,
  logger,
  unsecuredSavedObjectsClient,
  inMemoryConnectors,
}: HandleInboundRequestParams) {
  const connectorTypeId = normalizeConnectorTypeId(typeId);
  const baseLog = {
    spaceId,
    connectorId,
    connectorTypeId,
    requestId: request.id,
  };

  if (!inboundEventsEnabled) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'disabled' });
    return response.forbidden({ body: INBOUND_EVENTS_DISABLED_MESSAGE });
  }

  // Path schema maxLength is pre-normalize; reject post-normalize oversize (e.g. undotted 64 + '.').
  if (connectorTypeId.length > MAX_CONNECTOR_TYPE_ID_LENGTH) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'no_spec' });
    return response.notFound();
  }

  const spec = getConnectorSpec(connectorTypeId);
  if (!spec?.events) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'no_spec' });
    return response.notFound();
  }

  const connector = await loadInboundConnector({
    connectorId,
    connectorTypeId,
    spaceId,
    unsecuredSavedObjectsClient,
    inMemoryConnectors,
    logger,
  });
  if (!connector) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'load_miss' });
    return response.notFound();
  }

  const ingestTokenHash =
    typeof connector.config.ingestTokenHash === 'string'
      ? connector.config.ingestTokenHash
      : undefined;
  if (typeof ingestTokenHash !== 'string' || ingestTokenHash.length === 0) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'auth_fail' });
    return response.notFound();
  }

  // Query is validated by the route schema before the handler runs.
  const providedToken = extractIngestToken({
    query: request.query,
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
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'auth_fail' });
    return response.notFound();
  }

  try {
    const result = await spec.events.handleEvents({
      connectorId,
      connectorTypeId,
      spaceId,
      config: stripIngestTokenHash(connector.config),
      rawBody: request.body,
      log: logger,
    });

    if (result.type !== 'emit') {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: 'unexpected_handleEvents_type',
      });
      return response.customError({
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      });
    }

    if (result.events.length > maxEmittedEvents) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: `emitted_events=${result.events.length}_max=${maxEmittedEvents}`,
      });
      return response.customError({
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      });
    }

    const validation = validateEmittedEvents(spec.events.definitions, result.events);
    if (!validation.ok) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'validate_fail',
        detail: JSON.stringify(validation.errors),
      });
      return response.customError({
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      });
    }

    let emitFailures = 0;
    for (const event of result.events) {
      try {
        const emitResult = await emitConnectorEvents({
          eventId: event.eventId,
          payload: event.payload,
          spaceId,
          connectorId,
          connectorTypeId,
          correlationKey: event.correlationKey,
        });
        // HTTP stays 202; count failures for emit_partial (dispatch warns once on Result).
        if (!emitResult.ok) {
          emitFailures += 1;
        }
      } catch (error) {
        emitFailures += 1;
        logger.warn(
          `Inbound connector ${connectorId} type ${connectorTypeId} space ${spaceId} event emitter threw for ${
            event.eventId
          }: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (emitFailures > 0) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'emit_partial',
        detail: `emit_failures=${emitFailures}_of=${result.events.length}`,
      });
    } else {
      logInboundIngressOutcome(logger, { ...baseLog, outcome: 'accepted' });
    }

    return response.accepted({ body: { ok: true } });
  } catch (error) {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome: 'handle_fail',
      detail: error instanceof Error ? error.message : String(error),
    });
    return response.customError({
      statusCode: 500,
      body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
    });
  }
}
