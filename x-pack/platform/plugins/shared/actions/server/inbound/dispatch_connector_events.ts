/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConnectorEventEmitParams,
  ConnectorEventEmitter,
  DispatchConnectorEventsResult,
} from './types';

/**
 * Delivers a connector event to the registered emitter.
 * Returns a Result so the HTTP layer can log a single `emit_partial` outcome.
 * Callers must still isolate failures so the ingress response stays 202.
 */
export async function dispatchConnectorEvents({
  emitter,
  params,
}: {
  emitter: ConnectorEventEmitter | undefined;
  params: ConnectorEventEmitParams;
}): Promise<DispatchConnectorEventsResult> {
  if (!emitter) {
    return {
      ok: false,
      reason: 'no_emitter',
      message: `No connector event emitter registered; dropping event ${params.eventId} for connector ${params.connectorId} type ${params.connectorTypeId} space ${params.spaceId}`,
    };
  }

  try {
    await emitter.emit(params);
    return { ok: true };
  } catch (reason) {
    return {
      ok: false,
      reason: 'emit_threw',
      message: reason instanceof Error ? reason.message : String(reason),
    };
  }
}
