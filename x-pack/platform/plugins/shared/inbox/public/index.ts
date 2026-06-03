/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { InboxPublicPlugin } from './plugin';
import type {
  InboxClientConfig,
  InboxPublicSetup,
  InboxPublicStart,
  InboxSetupDependencies,
  InboxStartDependencies,
} from './types';

export type { InboxPublicSetup, InboxPublicStart };

export const plugin: PluginInitializer<
  InboxPublicSetup,
  InboxPublicStart,
  InboxSetupDependencies,
  InboxStartDependencies
> = (context: PluginInitializerContext<InboxClientConfig>) => new InboxPublicPlugin(context);
