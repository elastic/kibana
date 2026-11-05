/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defineApiKeyStorage,
  encodeUiamApiKey,
  toEsApiKey,
  toUiamApiKey,
} from '@kbn/response-ops-api-keys';
import type { ConnectorEventIdentity } from '../inbound/event_identity/types';

/** How a connector stores its event identity. The keys are always Kibana-owned. */
export const connectorEventIdentityStorage = defineApiKeyStorage<ConnectorEventIdentity>({
  write: ({ es, uiam }) => ({
    ...(es ? { apiKey: es.encoded } : {}),
    ...(uiam ? { uiamApiKey: encodeUiamApiKey(uiam), uiamApiKeyExternal: uiam.external } : {}),
  }),
  read: ({ apiKey, uiamApiKey, uiamApiKeyExternal }) => {
    if (!apiKey && !uiamApiKey) {
      return undefined;
    }
    return {
      createdByUser: false,
      ...(apiKey ? { es: toEsApiKey(apiKey) } : {}),
      ...(uiamApiKey ? { uiam: toUiamApiKey(uiamApiKey, { external: uiamApiKeyExternal }) } : {}),
    };
  },
});
