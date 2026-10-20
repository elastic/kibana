/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetup } from '@kbn/actions-plugin/server';
import type { CallbackTransportDefinition } from '@kbn/agent-builder-server';
import { throwIfNotDelivered } from '@kbn/agent-builder-server';

/** Delivers to Relay callback URLs through the Actions Relay client. */
export const createRelayTransport = ({
  actions,
}: {
  actions: ActionsPluginSetup;
}): CallbackTransportDefinition => ({
  id: 'relay',
  handles: (callbackUrl) => actions.getRelayClient()?.isRelayOrigin(callbackUrl) ?? false,
  send: async (callbackUrl, payload, signal) => {
    const relayClient = actions.getRelayClient();

    if (!relayClient) {
      throw new Error('The Relay client is not available');
    }

    throwIfNotDelivered(await relayClient.postCallback(callbackUrl, payload, signal));
  },
});
