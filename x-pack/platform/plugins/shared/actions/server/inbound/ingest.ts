/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  getConnectorSpec,
  MAX_CONNECTOR_TYPE_ID_LENGTH,
  normalizeConnectorTypeId,
  validateEmittedEvents,
  type HandleEventsHttpResponse,
  type HandleEventsResult,
} from '@kbn/connector-specs';

import type { IngestEventsRequestQuery } from '../../common/routes/events/apis/ingest';
import type { InMemoryConnector } from '../types';
import {
  INBOUND_EVENTS_DISABLED_MESSAGE,
  INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
} from './constants';
import { logInboundIngressOutcome } from './log_inbound_ingress_outcome';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';
import { loadInboundConnector } from './load_inbound_connector';

export type IngestInboundEventResult =
  | { status: 'forbidden'; body: string }
  | { status: 'not_found' }
  | { status: 'error'; statusCode: 500; body: string }
  | { status: 'accepted'; body: { ok: true } }
  | {
      status: 'spoke_http';
      statusCode: number;
      body?: unknown;
      headers?: Record<string, string>;
    };

export interface IngestInboundEventInput {
  connectorTypeId: string;
  connectorId: string;
  spaceId: string;
  requestId?: string;
  headers: Record<string, string | string[] | undefined>;
  query: IngestEventsRequestQuery;
  body: unknown;
}

export interface IngestInboundEventParams extends IngestInboundEventInput {
  inboundEventsEnabled: boolean;
  isActionTypeEnabled: (actionTypeId: string) => boolean;
  maxEmitted: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  logger: Logger;
  getUnsecuredSavedObjectsClient: (spaceId: string) => Promise<SavedObjectsClientContract>;
  inMemoryConnectors: InMemoryConnector[];
}

const stripIngestTokenHash = (config: Record<string, unknown>): Record<string, unknown> => {
  const { ingestTokenHash: _omit, ...spokeConfig } = config;
  return spokeConfig;
};

const SPOKE_HTTP_STATUS_MIN = 200;
const SPOKE_HTTP_STATUS_MAX = 599;

const isValidSpokeHttpHeaders = (
  headers: HandleEventsHttpResponse['headers']
): headers is Record<string, string> | undefined => {
  if (headers === undefined) {
    return true;
  }
  return Object.entries(headers).every(
    ([key, value]) => key.length > 0 && typeof value === 'string'
  );
};

/**
 * Validates a spoke `type: 'http'` result. Invalid shapes fail closed (500)
 * rather than forwarding an unbounded status to the caller.
 */
const parseSpokeHttpResponse = (
  result: HandleEventsResult
): HandleEventsHttpResponse | 'not_http' | 'invalid' => {
  if (result.type === 'emit') {
    return 'not_http';
  }
  if (result.type !== 'http' || result.httpResponse === undefined) {
    return 'invalid';
  }
  const { httpResponse } = result;
  if (
    !Number.isInteger(httpResponse.status) ||
    httpResponse.status < SPOKE_HTTP_STATUS_MIN ||
    httpResponse.status > SPOKE_HTTP_STATUS_MAX ||
    !isValidSpokeHttpHeaders(httpResponse.headers)
  ) {
    return 'invalid';
  }
  return httpResponse;
};

/**
 * Orchestrates inbound connector event ingest (no HTTP mapping).
 */
export async function ingestInboundEvent({
  connectorTypeId: connectorTypeIdParam,
  connectorId,
  spaceId,
  requestId,
  headers,
  query,
  body,
  inboundEventsEnabled,
  isActionTypeEnabled,
  maxEmitted,
  emitConnectorEvents,
  logger,
  getUnsecuredSavedObjectsClient,
  inMemoryConnectors,
}: IngestInboundEventParams): Promise<IngestInboundEventResult> {
  const connectorTypeId = normalizeConnectorTypeId(connectorTypeIdParam);
  const baseLog = {
    spaceId,
    connectorId,
    connectorTypeId,
    requestId,
  };

  if (!inboundEventsEnabled) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'disabled' });
    return { status: 'forbidden', body: INBOUND_EVENTS_DISABLED_MESSAGE };
  }

  // Path schema maxLength is pre-normalize; reject post-normalize oversize (e.g. undotted 64 + '.').
  if (connectorTypeId.length > MAX_CONNECTOR_TYPE_ID_LENGTH) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'no_spec' });
    return { status: 'not_found' };
  }

  const spec = getConnectorSpec(connectorTypeId);
  if (!spec?.events) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'no_spec' });
    return { status: 'not_found' };
  }

  if (!isActionTypeEnabled(connectorTypeId)) {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome: 'no_spec',
      detail: 'type_disabled',
    });
    return { status: 'not_found' };
  }

  const unsecuredSavedObjectsClient = await getUnsecuredSavedObjectsClient(spaceId);

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
    return { status: 'not_found' };
  }

  const ingestTokenHash =
    typeof connector.config.ingestTokenHash === 'string'
      ? connector.config.ingestTokenHash
      : undefined;
  if (typeof ingestTokenHash !== 'string' || ingestTokenHash.length === 0) {
    logInboundIngressOutcome(logger, { ...baseLog, outcome: 'auth_fail' });
    return { status: 'not_found' };
  }

  // Query is validated by the route schema before ingest runs.
  const providedToken = extractIngestToken({
    query,
    headers,
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
    return { status: 'not_found' };
  }

  try {
    const result = await spec.events.handleEvents({
      connectorId,
      connectorTypeId,
      spaceId,
      config: stripIngestTokenHash(connector.config),
      rawBody: body,
      log: logger,
    });

    const spokeHttp = parseSpokeHttpResponse(result);
    if (spokeHttp === 'invalid') {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: 'unexpected_handleEvents_type',
      });
      return {
        status: 'error',
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      };
    }
    if (spokeHttp !== 'not_http') {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'http_ack',
        detail: `status=${spokeHttp.status}`,
      });
      return {
        status: 'spoke_http',
        statusCode: spokeHttp.status,
        ...(spokeHttp.body !== undefined ? { body: spokeHttp.body } : {}),
        ...(spokeHttp.headers !== undefined ? { headers: spokeHttp.headers } : {}),
      };
    }

    if (result.type !== 'emit') {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: 'unexpected_handleEvents_type',
      });
      return {
        status: 'error',
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      };
    }

    if (result.events.length > maxEmitted) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: `emitted_events=${result.events.length}_max=${maxEmitted}`,
      });
      return {
        status: 'error',
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      };
    }

    const validation = validateEmittedEvents(spec.events.definitions, result.events);
    if (!validation.ok) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'validate_fail',
        detail: JSON.stringify(validation.errors),
      });
      return {
        status: 'error',
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      };
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

    return { status: 'accepted', body: { ok: true } };
  } catch (error) {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome: 'handle_fail',
      detail: error instanceof Error ? error.message : String(error),
    });
    return {
      status: 'error',
      statusCode: 500,
      body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
    };
  }
}
