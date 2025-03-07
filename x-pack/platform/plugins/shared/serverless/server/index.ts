/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { config } from './config';

export const plugin = async () => {
  const { ServerlessPlugin } = await import('./plugin');
  return new ServerlessPlugin();
};

export type {
  ServerlessServerSetup as ServerlessPluginSetup,
  ServerlessServerStart as ServerlessPluginStart,
} from './types';
