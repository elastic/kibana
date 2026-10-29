/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { configSchema, type NotebookConfig } from './config';
import type { NotebookServerPlugin } from './plugin';

export const config: PluginConfigDescriptor<NotebookConfig> = {
  schema: configSchema,
};

export const plugin = async (
  _initializerContext: PluginInitializerContext
): Promise<NotebookServerPlugin> => {
  const { NotebookServerPlugin: Plugin } = await import('./plugin');
  return new Plugin();
};
