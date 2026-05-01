/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/server';
import type { InboxConfig } from './config';
import type {
  InboxPluginSetup,
  InboxPluginStart,
  InboxSetupDependencies,
  InboxStartDependencies,
} from './types';
import { InboxPlugin } from './plugin';

export type { InboxPluginSetup, InboxPluginStart };

export const plugin: PluginInitializer<
  InboxPluginSetup,
  InboxPluginStart,
  InboxSetupDependencies,
  InboxStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InboxConfig>) =>
  new InboxPlugin(pluginInitializerContext);

export { config } from './config';
