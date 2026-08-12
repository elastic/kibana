/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConnectorEventEmitParams {
  eventId: string;
  payload: Record<string, unknown>;
  spaceId: string;
  connectorId: string;
  connectorTypeId: string;
  correlationKey?: string;
}

/**
 * Sink for connector events produced by the inbound hub.
 * A single emitter is registered (workflows bridge in Phase 1).
 */
export interface ConnectorEventEmitter {
  emit(params: ConnectorEventEmitParams): Promise<void>;
}
