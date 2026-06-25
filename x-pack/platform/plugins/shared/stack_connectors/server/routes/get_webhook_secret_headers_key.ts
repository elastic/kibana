/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import {
  registerSecretKeysRoute,
  type ConnectorsPluginsStart,
} from './lib/get_decrypted_secret_keys';

export const getWebhookSecretHeadersKeyRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<ConnectorsPluginsStart, unknown>
) => {
  registerSecretKeysRoute({
    router,
    getStartServices,
    path: 'secret_headers',
    allowedConnectorTypes: ['.webhook', '.cases-webhook', '.mcp', '.http'],
    secretField: 'secretHeaders',
  });
};
