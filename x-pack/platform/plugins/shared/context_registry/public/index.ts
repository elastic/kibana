/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PluginInitializerContext } from '@kbn/core/public';
import { ContextRegistryPlugin } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new ContextRegistryPlugin(initializerContext);
};

export type { ContextResponse } from '../common/types';

export type {
  ContextDefinitionPublic,
  ContextChildrenProps,
} from './services/context_registry_public';

export type { ContextRegistryPublicSetup, ContextRegistryPublicStart } from './plugin';
