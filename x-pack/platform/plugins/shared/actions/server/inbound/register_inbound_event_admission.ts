/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeConnectorTypeId } from '@kbn/connector-specs';
import type { LifecycleResponseFactory } from '@kbn/core-http-server';
import type { HttpServiceSetup, KibanaRequest, Logger, OnPreAuthToolkit } from '@kbn/core/server';

import type { InboundEventAdmissionConfig } from '../actions_config';
import { INBOUND_EVENTS_API_PATH, INBOUND_EVENTS_RATE_LIMITED_MESSAGE } from './constants';
import type { InboundEventAdmission } from './inbound_event_admission';
import { logInboundIngressOutcome } from './log_inbound_ingress_outcome';

const isInboundEventParams = (
  params: unknown
): params is { connector_type_id: string; connector_id: string } => {
  if (typeof params !== 'object' || params === null) {
    return false;
  }
  const record = params as { connector_type_id?: unknown; connector_id?: unknown };
  return (
    typeof record.connector_type_id === 'string' &&
    record.connector_type_id.length > 0 &&
    typeof record.connector_id === 'string' &&
    record.connector_id.length > 0
  );
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
  if (!isInboundEventsRoute(request) || !isInboundEventParams(request.params)) {
    return toolkit.next();
  }

  const connectorTypeId = normalizeConnectorTypeId(request.params.connector_type_id);
  const connectorId = request.params.connector_id;
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
