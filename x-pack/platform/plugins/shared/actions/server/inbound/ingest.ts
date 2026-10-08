/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IClusterClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import {
  connectorTypeIsDual,
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
import { resolveKibanaInboundRequest } from './resolve_kibana_inbound_request';
import { extractIngestToken, verifyIngestToken } from './verify_ingress_auth';
import { loadIngressCredential, parseIngestToken } from './ingress_credential';
import type { InboundEventRateLimiter } from './inbound_event_rate_limiter';
import { loadInboundConnector } from './load_inbound_connector';
import { validateSpokeHttpHeaders } from './spoke_http';

export type IngestInboundEventResult =
  | { status: 'forbidden'; body: string }
  | { status: 'not_found' }
  | { status: 'error'; statusCode: 500; body: string }
  | { status: 'accepted'; body: { ok: true } }
  | { status: 'rate_limited'; retryAfterSeconds: number; budget: 'connector' }
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
  remoteAddress: string | undefined;
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
  getElasticsearchClient: () => Promise<IClusterClient>;
  getKibanaRequestAccess: (request: KibanaRequest) => Promise<boolean>;
  inMemoryConnectors: InMemoryConnector[];
  rateLimiter: InboundEventRateLimiter;
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
  remoteAddress,
  inboundEventsEnabled,
  isActionTypeEnabled,
  maxEmitted,
  maxBodyBytes,
  emitConnectorEvents,
  logger,
  getUnsecuredSavedObjectsClient,
  getDecryptedConnectorAttributes,
  getElasticsearchClient,
  getKibanaRequestAccess,
  inMemoryConnectors,
  rateLimiter,
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

  // Socket plus connector. Behind a proxy the socket is shared, so each connector has its own bucket.
  const remoteAddressKey = `${
    remoteAddress || 'unknown'
  }\0${spaceId}\0${connectorTypeId}\0${connectorId}`;

  const rateLimited = (retryAfterSeconds: number): IngestInboundEventResult => {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome: 'rate_limited',
      detail: `budget=connector retryAfter=${retryAfterSeconds}`,
      budget: 'connector',
      retryAfterSeconds,
    });
    return { status: 'rate_limited', retryAfterSeconds, budget: 'connector' };
  };

  const notFound = (
    outcome: 'no_spec' | 'load_miss' | 'auth_fail',
    detail?: string
  ): IngestInboundEventResult => {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome,
      ...(detail !== undefined ? { detail } : {}),
    });
    // A missing type or connector must not take a key. The id is chosen by the caller.
    if (outcome === 'auth_fail') {
      rateLimiter.recordRemoteAddressFailure(remoteAddressKey);
    }
    return { status: 'not_found' };
  };

  const addressDecision = rateLimiter.peekRemoteAddress(remoteAddressKey);
  if (!addressDecision.allowed) {
    logInboundIngressOutcome(logger, {
      ...baseLog,
      outcome: 'rate_limited',
      detail: `budget=remote_address retryAfter=${addressDecision.retryAfterSeconds}`,
      budget: 'remoteAddress',
      retryAfterSeconds: addressDecision.retryAfterSeconds,
    });
    // Same 404 as a missing connector. A 429 here would show that the connector exists.
    return { status: 'not_found' };
  }

  // Path schema maxLength is pre-normalize; reject post-normalize oversize (e.g. undotted 64 + '.').
  if (connectorTypeId.length > MAX_CONNECTOR_TYPE_ID_LENGTH) {
    return notFound('no_spec');
  }

  const spec = getConnectorSpec(connectorTypeId);
  if (!spec?.events) {
    return notFound('no_spec');
  }

  if (!isActionTypeEnabled(connectorTypeId)) {
    return notFound('no_spec', 'type_disabled');
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
    return notFound('load_miss');
  }

  const connectorEventsEnabled = connector.hasPreconfiguredInboundEvents === true;

  if (
    connectorTypeIsDual(connector.connectorTypeId) &&
    !connectorEventsEnabled &&
    connector.hasInboundEventIdentity !== true
  ) {
    return notFound('load_miss', 'inbound_events_disabled');
  }

  let kibanaScheduleRequest: KibanaRequest | undefined;
  // In-memory events-on connectors have no ingest token. A saved identity stays on the token path.
  if (connectorEventsEnabled && connector.hasInboundEventIdentity !== true) {
    try {
      kibanaScheduleRequest = await resolveKibanaInboundRequest({
        headers,
        spaceId,
        elasticsearchClient: await getElasticsearchClient(),
        getKibanaRequestAccess,
      });
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
    if (!kibanaScheduleRequest) {
      return notFound('auth_fail');
    }
  } else {
    const providedToken = extractIngestToken({
      query,
      headers,
    });
    const parsedToken = providedToken ? parseIngestToken(providedToken) : undefined;
    if (!providedToken || !parsedToken) {
      return notFound('auth_fail');
    }

    const credential = await loadIngressCredential({
      unsecuredSavedObjectsClient,
      credentialId: parsedToken.credentialId,
      connectorId,
    });
    if (
      !credential ||
      !verifyIngestToken({
        connectorId,
        spaceId,
        providedToken,
        ingestTokenHash: credential.ingestTokenHash,
      })
    ) {
      return notFound('auth_fail');
    }
  }

  const connectorDecision = rateLimiter.consume(
    'connector',
    `${spaceId}\0${connectorTypeId}\0${connectorId}`
  );
  if (!connectorDecision.allowed) {
    return rateLimited(connectorDecision.retryAfterSeconds);
  }

  try {
    const parsed = parseHandleEventsResult(
      await spec.events.handleEvents({
        connectorId,
        connectorTypeId,
        spaceId,
        config: stripIngestTokenHash(connector.config),
        rawBody: body,
        headers: {
          'x-github-event': headers['x-github-event'],
          'x-github-delivery': headers['x-github-delivery'],
        },
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

    let scheduleRequest = kibanaScheduleRequest;
    if (!scheduleRequest) {
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
