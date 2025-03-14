/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { ConfigSchema, IEventLogConfig } from './types';

export { millisToNanos, nanosToMillis } from '../common';

export type {
  IEventLogService,
  IEventLogger,
  IEventLogClientService,
  IEvent,
  IValidatedEvent,
  IEventLogClient,
  QueryEventsBySavedObjectResult,
  AggregateEventsBySavedObjectResult,
  InternalFields,
  IValidatedEventInternalDocInfo,
} from './types';
export { SAVED_OBJECT_REL_PRIMARY } from './types';

export { createReadySignal } from './lib/ready_signal';

export const config: PluginConfigDescriptor<IEventLogConfig> = {
  schema: ConfigSchema,
};
export const plugin = async (context: PluginInitializerContext) => {
  const { Plugin } = await import('./plugin');
  return new Plugin(context);
};
