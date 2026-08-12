/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { ConnectorEventEmitParams, ConnectorEventEmitter } from './types';

/**
 * Delivers a connector event to the registered emitter.
 * Failures are logged and do not fail the HTTP request (still 202).
 */
export async function dispatchConnectorEvents({
  emitter,
  params,
  logger,
}: {
  emitter: ConnectorEventEmitter | undefined;
  params: ConnectorEventEmitParams;
  logger: Logger;
}): Promise<void> {
  if (!emitter) {
    logger.warn(
      `No connector event emitter registered; dropping event ${params.eventId} for connector ${params.connectorId}`
    );
    return;
  }

  try {
    await emitter.emit(params);
  } catch (reason) {
    logger.warn(
      `Connector event emitter failed for event ${params.eventId} connector ${
        params.connectorId
      }: ${reason instanceof Error ? reason.message : String(reason)}`
    );
  }
}
