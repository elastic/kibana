/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeConnectorTypeId } from '@kbn/connector-specs';
import type { LifecycleResponseFactory } from '@kbn/core-http-server';
import type {
  HttpServiceSetup,
  KibanaRequest,
  Logger,
  OnPreAuthToolkit,
  OnPreResponseInfo,
  OnPreResponseToolkit,
} from '@kbn/core/server';

import type { InboundEventAdmissionConfig } from '../actions_config';
import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_MALFORMED_PATH_MESSAGE,
  INBOUND_EVENTS_RATE_LIMITED_MESSAGE,
} from './constants';
import type { InboundEventAdmission } from './inbound_event_admission';
import { logInboundIngressOutcome } from './log_inbound_ingress_outcome';

const inboundEventIdsPattern = new RegExp(
  `^${INBOUND_EVENTS_API_PATH.replace('{connector_type_id}', '([^/]+)').replace(
    '{connector_id}',
    '([^/]+)'
  )}$`
);

/**
 * `route.path` is still percent-encoded. Hapi decodes params with one decodeURIComponent pass.
 * A bad sequence is undefined so it is not used as its own admission key.
 */
const decodeInboundPathSegment = (segment: string): string | undefined => {
  try {
    const decoded = decodeURIComponent(segment);
    return decoded.length > 0 ? decoded : undefined;
  } catch (error) {
    if (error instanceof URIError) {
      return undefined;
    }
    throw error;
  }
};

/**
 * onPreAuth calls CoreKibanaRequest.from without route schemas, so request.params is {}.
 * The ids are on the URL (`route.path`).
 */
const readInboundEventIds = (
  pathname: string
): { connectorTypeId: string; connectorId: string } | 'malformed' | undefined => {
  const match = inboundEventIdsPattern.exec(pathname);
  if (!match) {
    return undefined;
  }
  const [, rawConnectorTypeId, rawConnectorId] = match;
  if (!rawConnectorTypeId || !rawConnectorId) {
    return undefined;
  }
  const connectorTypeId = decodeInboundPathSegment(rawConnectorTypeId);
  const connectorId = decodeInboundPathSegment(rawConnectorId);
  if (!connectorTypeId || !connectorId) {
    return 'malformed';
  }
  return { connectorTypeId, connectorId };
};

const isInboundEventsRoute = (request: KibanaRequest): boolean =>
  request.route.method === 'post' &&
  (request.route.routePath ?? request.route.path) === INBOUND_EVENTS_API_PATH;

/**
 * Registers the in-flight cap on the inbound events route. Other routes are unchanged.
 */
export const registerInboundEventAdmission = ({
  http,
  logger,
  admission,
  config,
  maxBodyBytes,
  getSpaceId,
}: {
  http: Pick<HttpServiceSetup, 'registerOnPreAuth'>;
  logger: Logger;
  admission: InboundEventAdmission;
  config: InboundEventAdmissionConfig;
  maxBodyBytes: number;
  getSpaceId: (request: KibanaRequest) => string;
}): void => {
  if (!config.enabled) {
    return;
  }

  logger.info(
    `Inbound events admission maxInFlight=${config.maxInFlight} maxInFlightPerConnector=${config.maxInFlightPerConnector} maxBodyBytes=${maxBodyBytes}`
  );

  http.registerOnPreAuth((request, response, toolkit) =>
    admitInboundEventRequest({ request, response, toolkit, admission, logger, getSpaceId })
  );
};

export const admitInboundEventRequest = ({
  request,
  response,
  toolkit,
  admission,
  logger,
  getSpaceId,
}: {
  request: KibanaRequest;
  response: LifecycleResponseFactory;
  toolkit: OnPreAuthToolkit;
  admission: InboundEventAdmission;
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string;
}) => {
  if (!isInboundEventsRoute(request)) {
    return toolkit.next();
  }
  const ids = readInboundEventIds(request.route.path);
  if (ids === 'malformed') {
    return response.badRequest({ body: INBOUND_EVENTS_MALFORMED_PATH_MESSAGE });
  }
  if (!ids) {
    return toolkit.next();
  }

  const connectorTypeId = normalizeConnectorTypeId(ids.connectorTypeId);
  const connectorId = ids.connectorId;
  const spaceId = getSpaceId(request);
  const decision = admission.tryAdmit(`${spaceId}\0${connectorTypeId}\0${connectorId}`);
  if (!decision.allowed) {
    logInboundIngressOutcome(logger, {
      outcome: 'rate_limited',
      spaceId,
      connectorId,
      connectorTypeId,
      requestId: request.id,
      detail: `budget=inflight scope=${decision.scope} retryAfter=1`,
      budget: 'inflight',
      scope: decision.scope,
      retryAfterSeconds: 1,
    });
    return response.customError({
      statusCode: 429,
      body: INBOUND_EVENTS_RATE_LIMITED_MESSAGE,
      headers: {
        'Retry-After': '1',
        RateLimit: '"inbound-events";r=0;t=1',
      },
    });
  }

  request.events.completed$.subscribe({ next: decision.release });
  return toolkit.next();
};

/**
 * Counts a body rejected by the route `maxBytes` limit. That 413 is produced before the handler runs.
 */
export const registerInboundEventSizeOutcome = ({
  http,
  logger,
  getSpaceId,
}: {
  http: Pick<HttpServiceSetup, 'registerOnPreResponse'>;
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string;
}): void => {
  http.registerOnPreResponse((request, preResponse, toolkit) =>
    recordOversizedInboundEvent({ request, preResponse, toolkit, logger, getSpaceId })
  );
};

export const recordOversizedInboundEvent = ({
  request,
  preResponse,
  toolkit,
  logger,
  getSpaceId,
}: {
  request: KibanaRequest;
  preResponse: OnPreResponseInfo;
  toolkit: OnPreResponseToolkit;
  logger: Logger;
  getSpaceId: (request: KibanaRequest) => string;
}) => {
  if (preResponse.statusCode !== 413 || !isInboundEventsRoute(request)) {
    return toolkit.next();
  }

  const ids = readInboundEventIds(request.route.path);
  const connectorTypeId =
    ids && ids !== 'malformed' ? normalizeConnectorTypeId(ids.connectorTypeId) : 'unknown';
  const connectorId = ids && ids !== 'malformed' ? ids.connectorId : 'unknown';
  let spaceId = 'unknown';
  try {
    spaceId = getSpaceId(request);
  } catch (error) {
    logger.debug(
      `Inbound events size outcome could not read the space id: ${
        error instanceof Error ? error.message : 'unknown'
      }`
    );
  }

  logInboundIngressOutcome(logger, {
    outcome: 'payload_too_large',
    spaceId,
    connectorId,
    connectorTypeId,
    requestId: request.id,
    detail: 'body_exceeds_max_bytes',
  });
  return toolkit.next();
};
