/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const plugin = async () => {
  const { SecretsPlugin } = await import('./plugin');
  return new SecretsPlugin();
};

export { config } from './config';
export type { SecretsConfig } from './config';
export type { SecretsPluginSetup, SecretsPluginStart } from './types';
