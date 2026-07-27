/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import { configSchema, type EventBusConfig } from './config';

export { BROADCAST_TARGET } from './types';
export type {
  EventBusSetup,
  EventBusStart,
  BusEvent,
  EventHandler,
  EventTypeDefinition,
  PublishEventParams,
  SubscribeOptions,
  Subscription,
} from './types';

export const config: PluginConfigDescriptor<EventBusConfig> = {
  schema: configSchema,
};

export const plugin = async (initializerContext: PluginInitializerContext) => {
  const { EventBusPlugin } = await import('./plugin');
  return new EventBusPlugin(initializerContext);
};
