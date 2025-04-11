/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { Plugin } from './plugin';
import { StreamsPluginSetup, StreamsPluginStart } from './types';

export type { StreamsPluginSetup, StreamsPluginStart };

export const plugin: PluginInitializer<StreamsPluginSetup, StreamsPluginStart> = (
  context: PluginInitializerContext
) => {
  return new Plugin(context);
};
