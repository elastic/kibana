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
  parseHandleEventsResult,
  validateEmittedEvents,
} from '@kbn/connector-specs';

import type { IngestEventsRequestQuery } from '../../common/routes/events/apis/ingest';
import type { InMemoryConnector, RawAction } from '../types';
import { resolveConnectorEventScheduleRequest } from './event_identity';
import {
  INBOUND_EVENTS_DISABLED_MESSAGE,
  INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
} from './constants';
import { logInboundIngressOutcome } from './log_inbound_ingress_outcome';
import type { ConnectorEventEmitParams, DispatchConnectorEventsResult } from './types';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';
import { loadInboundConnector } from './load_inbound_connector';
import { validateSpokeHttpHeaders } from './spoke_http';

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
  maxBodyBytes: number;
  emitConnectorEvents: (params: ConnectorEventEmitParams) => Promise<DispatchConnectorEventsResult>;
  logger: Logger;
  getUnsecuredSavedObjectsClient: (spaceId: string) => Promise<SavedObjectsClientContract>;
  getDecryptedConnectorAttributes: (connectorId: string, spaceId: string) => Promise<RawAction>;
  inMemoryConnectors: InMemoryConnector[];
}

const stripIngestTokenHash = (config: Record<string, unknown>): Record<string, unknown> => {
  const { ingestTokenHash: _omit, ...spokeConfig } = config;
  return spokeConfig;
};

/**
 * Orchestrates inbound connector event ingest and maps connector HTTP acks to the caller.
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
  maxBodyBytes,
  emitConnectorEvents,
  logger,
  getUnsecuredSavedObjectsClient,
  getDecryptedConnectorAttributes,
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
    const parsed = parseHandleEventsResult(
      await spec.events.handleEvents({
        connectorId,
        connectorTypeId,
        spaceId,
        config: stripIngestTokenHash(connector.config),
        rawBody: body,
        log: logger,
      }),
      { maxEvents: maxEmitted, maxPayloadBytes: maxBodyBytes }
    );
    if (!parsed.ok) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'handle_fail',
        detail: `invalid_handleEvents_result ${parsed.message}`,
      });
      return {
        status: 'error',
        statusCode: 500,
        body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
      };
    }
    const result = parsed.data;

    if (result.type === 'http') {
      const spokeHeaders = validateSpokeHttpHeaders(result.httpResponse.headers);
      if (spokeHeaders === 'invalid') {
        logInboundIngressOutcome(logger, {
          ...baseLog,
          outcome: 'handle_fail',
          detail: 'invalid_http_ack',
        });
        return {
          status: 'error',
          statusCode: 500,
          body: INBOUND_EVENTS_UNEXPECTED_ERROR_MESSAGE,
        };
      }
      const { status, body: spokeBody } = result.httpResponse;
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'http_ack',
        detail: `status=${status}`,
      });
      return {
        status: 'spoke_http',
        statusCode: status,
        ...(spokeBody !== undefined ? { body: spokeBody } : {}),
        ...(spokeHeaders !== undefined ? { headers: spokeHeaders } : {}),
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

    if (result.events.length === 0) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'accepted',
      });
      return { status: 'accepted', body: { ok: true } };
    }

    let scheduleRequest;
    try {
      const attributes = await getDecryptedConnectorAttributes(connectorId, spaceId);
      scheduleRequest = resolveConnectorEventScheduleRequest(attributes, spaceId);
    } catch (error) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'identity_missing',
        detail: `decrypt_failed ${error instanceof Error ? error.message : String(error)}`,
      });
      return { status: 'accepted', body: { ok: true } };
    }

    if (!scheduleRequest) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'identity_missing',
        detail: 'missing_api_key',
      });
      return { status: 'accepted', body: { ok: true } };
    }

    let emitFailures = 0;
    const emitFailureDetails: string[] = [];
    for (const event of result.events) {
      try {
        const emitResult = await emitConnectorEvents({
          eventId: event.eventId,
          payload: event.payload,
          spaceId,
          connectorId,
          connectorTypeId,
          correlationKey: event.correlationKey,
          request: scheduleRequest,
        });
        // HTTP stays 202; ingest logs a single emit_partial outcome.
        if (!emitResult.ok) {
          emitFailures += 1;
          emitFailureDetails.push(`${event.eventId} ${emitResult.reason}: ${emitResult.message}`);
        }
      } catch (error) {
        emitFailures += 1;
        emitFailureDetails.push(
          `${event.eventId} threw: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    if (emitFailures > 0) {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'emit_partial',
        detail: `emit_failures=${emitFailures}_of=${result.events.length} ${emitFailureDetails.join(
          '; '
        )}`,
      });
    } else {
      logInboundIngressOutcome(logger, {
        ...baseLog,
        outcome: 'accepted',
        detail: result.events.map((event) => event.eventId).join(','),
      });
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
