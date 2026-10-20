/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { recordInboundEventsRequest } from './inbound_events_metrics';

/**
 * Request-level ingress outcomes for logging and the request counter.
 * One outcome per HTTP response path from the inbound hub.
 */
export const INBOUND_INGRESS_OUTCOMES = [
  'disabled',
  'no_spec',
  'load_miss',
  'auth_fail',
  'handle_fail',
  'validate_fail',
  'emit_partial',
  'identity_missing',
  'http_ack',
  'accepted',
  'rate_limited',
  'payload_too_large',
] as const;

export type InboundIngressOutcome = (typeof INBOUND_INGRESS_OUTCOMES)[number];

/** Cap outcome `detail` to avoid Zod invalid_payload / huge JSON in logs. */
export const INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH = 1024;

export interface InboundIngressLogFields {
  outcome: InboundIngressOutcome;
  spaceId: string;
  connectorId: string;
  connectorTypeId: string;
  /** Kibana request id for cross-service correlation when available. */
  requestId?: string;
  /** Optional detail (eventId, error message, etc.) — truncated when logged. */
  detail?: string;
  /** Set for `rate_limited` only. */
  budget?: 'remoteAddress' | 'connector' | 'inflight';
  scope?: 'process' | 'connector';
  retryAfterSeconds?: number;
}

type IngressLogLevel = 'debug' | 'info' | 'warn' | 'error';

const OUTCOME_LOG_LEVEL: Record<Exclude<InboundIngressOutcome, 'rate_limited'>, IngressLogLevel> = {
  disabled: 'warn',
  // Expected fail-closed 404s: debug to limit scanner noise on public ingress.
  no_spec: 'debug',
  load_miss: 'debug',
  auth_fail: 'debug',
  handle_fail: 'error',
  validate_fail: 'error',
  emit_partial: 'warn',
  identity_missing: 'warn',
  http_ack: 'info',
  accepted: 'info',
  payload_too_large: 'info',
};

const ingressLogLevel = (fields: InboundIngressLogFields): IngressLogLevel => {
  if (fields.outcome === 'rate_limited') {
    return fields.budget === 'connector' ? 'info' : 'debug';
  }
  return OUTCOME_LOG_LEVEL[fields.outcome];
};

export const truncateInboundIngressDetail = (detail: string): string => {
  if (detail.length <= INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH) {
    return detail;
  }
  return `${detail.slice(0, INBOUND_INGRESS_OUTCOME_DETAIL_MAX_LENGTH)}…`;
};

/**
 * Logs one inbound ingress outcome and counts it on `kibana.actions.inbound_events.request.count`.
 */
export const logInboundIngressOutcome = (logger: Logger, fields: InboundIngressLogFields): void => {
  const {
    outcome,
    spaceId,
    connectorId,
    connectorTypeId,
    requestId,
    detail,
    budget,
    scope,
    retryAfterSeconds,
  } = fields;
  const level = ingressLogLevel(fields);
  const truncatedDetail = detail !== undefined ? truncateInboundIngressDetail(detail) : undefined;
  const requestSuffix = requestId !== undefined ? ` requestId=${requestId}` : '';
  const detailSuffix = truncatedDetail !== undefined ? ` detail=${truncatedDetail}` : '';
  logger[level](
    `Inbound events outcome=${outcome} spaceId=${spaceId} connectorId=${connectorId} connectorTypeId=${connectorTypeId}${requestSuffix}${detailSuffix}`,
    {
      tags: ['inbound_events', outcome],
      inboundEvents: {
        outcome,
        spaceId,
        connectorId,
        connectorTypeId,
        ...(requestId !== undefined ? { requestId } : {}),
        ...(truncatedDetail !== undefined ? { detail: truncatedDetail } : {}),
        ...(budget !== undefined ? { budget } : {}),
        ...(scope !== undefined ? { scope } : {}),
        ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
      },
    }
  );
  recordInboundEventsRequest(outcome);
};
