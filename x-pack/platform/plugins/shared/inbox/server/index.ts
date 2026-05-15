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

export type {
  InboxPluginSetup,
  InboxPluginStart,
  InboxActionProvider,
  InboxActionProviderListParams,
  InboxActionProviderListResult,
  InboxRequestContext,
} from './types';

export type { InboxActionConflictError } from './services/inbox_action_registry';
export {
  createInboxActionConflictError,
  isInboxActionConflictError,
} from './services/inbox_action_registry';

export const plugin: PluginInitializer<
  InboxPluginSetup,
  InboxPluginStart,
  InboxSetupDependencies,
  InboxStartDependencies
> = async (pluginInitializerContext: PluginInitializerContext<InboxConfig>) => {
  const { InboxPlugin } = await import('./plugin');
  return new InboxPlugin(pluginInitializerContext);
};

export { config } from './config';
