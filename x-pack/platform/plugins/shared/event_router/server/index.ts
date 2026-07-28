/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginConfigDescriptor,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core/server';
import { configSchema, type EventRouterConfig } from './config';
import type {
  EventRouterSetup,
  EventRouterSetupDeps,
  EventRouterStart,
  EventRouterStartDeps,
} from './types';

export const config: PluginConfigDescriptor<EventRouterConfig> = {
  schema: configSchema,
};

export const plugin: PluginInitializer<
  EventRouterSetup,
  EventRouterStart,
  EventRouterSetupDeps,
  EventRouterStartDeps
> = async (initializerContext: PluginInitializerContext<EventRouterConfig>) => {
  const { EventRouterPlugin } = await import('./plugin');
  return new EventRouterPlugin(initializerContext);
};

export type {
  EventRouterSetup,
  EventRouterStart,
  EventTypeDefinition,
  ListenerContext,
  ListenerDefinition,
  ListenerFilter,
  ListenerHandler,
  PublishEventParams,
  PublishResult,
  RouterEvent,
} from './types';
