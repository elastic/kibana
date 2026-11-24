/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { SecretsPlugin } = await import('./plugin');
  return new SecretsPlugin(initializerContext);
};

export { config } from './config';
export type { SecretsConfig } from './config';
export type { GetSecretsClientParams, SecretsPluginSetup, SecretsPluginStart } from './types';

// What every consumer needs to expose secrets over HTTP. A consumer registers its own routes,
// with its own paths and privileges, and uses these so that all of them accept the same
// requests and answer errors the same way: that is what `@kbn/secrets-ui` relies on.
export { handleSecretsRouteError } from './routes/handle_secrets_route_error';
export {
  createSecretBodySchema,
  replaceSecretBodySchema,
  secretNameParamsSchema,
} from './routes/route_schemas';
