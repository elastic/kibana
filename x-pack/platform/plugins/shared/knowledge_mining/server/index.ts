/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { KnowledgeMiningConfig } from './config';
import type {
  KnowledgeMiningPluginSetup,
  KnowledgeMiningPluginStart,
  KnowledgeMiningSetupDependencies,
  KnowledgeMiningStartDependencies,
} from './types';
import { KnowledgeMiningPlugin } from './plugin';

export type { KnowledgeMiningPluginSetup, KnowledgeMiningPluginStart };

export const plugin: PluginInitializer<
  KnowledgeMiningPluginSetup,
  KnowledgeMiningPluginStart,
  KnowledgeMiningSetupDependencies,
  KnowledgeMiningStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<KnowledgeMiningConfig>) => {
  return new KnowledgeMiningPlugin(pluginInitializerContext);
};

export { config } from './config';
