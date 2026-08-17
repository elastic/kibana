/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Local stand-in for the Actions inbound hub emitter contract.
 * Replace imports with `@kbn/actions-plugin/server` once the hub lands.
 */

/** Params the Actions hub will pass into a registered emitter. */
export interface ConnectorEventEmitParams {
  eventId: string;
  payload: Record<string, unknown>;
  spaceId: string;
  connectorId: string;
  connectorTypeId: string;
  correlationKey?: string;
}

/** Sink registered on the Actions hub via `registerConnectorEventEmitter`. */
export interface ConnectorEventEmitter {
  emit(params: ConnectorEventEmitParams): Promise<void>;
}

/**
 * Minimal Actions setup surface needed to register the bridge emitter.
 * Matches the future `PluginSetupContract.registerConnectorEventEmitter` API.
 */
export interface ActionsHubConnectorEventRegistry {
  registerConnectorEventEmitter(emitter: ConnectorEventEmitter): void;
}

/** No-op registry for environments where the Actions hub API is not available yet. */
export const noopActionsHubConnectorEventRegistry: ActionsHubConnectorEventRegistry = {
  registerConnectorEventEmitter: () => undefined,
};
