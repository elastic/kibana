/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { dispatchConnectorEvents } from './dispatch_connector_events';
export { computeIngestTokenHash } from './compute_ingest_token_hash';
export {
  applyInboundIngressCredentialsIfNeeded,
  ensureConnectorIngressCredentials,
  preserveInboundIngressHashIfNeeded,
  resolveInboundEventsSpaceId,
} from './ensure_connector_ingress_credentials';
export type { InboundEventsClient, InboundEventsClientArgs } from './factory';
export { createInboundEventsClient } from './factory';
export type {
  ConnectorEventEmitParams,
  ConnectorEventEmitter,
  DispatchConnectorEventsResult,
} from './types';
export {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_SECURITY,
} from './constants';
export type { InboundIngressOutcome } from './log_inbound_ingress_outcome';
export { INBOUND_INGRESS_OUTCOMES } from './log_inbound_ingress_outcome';
