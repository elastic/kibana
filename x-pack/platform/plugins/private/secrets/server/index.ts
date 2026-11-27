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
export {
  createSecretBodySchema,
  secretNameParamsSchema,
  updateSecretBodySchema,
} from './routes/request_schemas';
export { toSecretsErrorResponse } from './routes/secrets_error_response';
export type { SecretsConfig } from './config';
export type { SecretsClient } from './client/types';
export type { GetSecretsClientParams, SecretsPluginSetup, SecretsPluginStart } from './types';
