/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';

import { ScratchpadAppPlugin } from './plugin';
import type {
  ScratchpadAppPublicSetup,
  ScratchpadAppPublicStart,
  ScratchpadAppSetupDependencies,
  ScratchpadAppStartDependencies,
  ConfigSchema,
  ScratchpadApplicationComponentType,
  ScratchpadApplicationProps,
} from './types';

export type {
  ScratchpadAppPublicSetup,
  ScratchpadAppPublicStart,
  ScratchpadApplicationComponentType,
  ScratchpadApplicationProps,
};

export const plugin: PluginInitializer<
  ScratchpadAppPublicSetup,
  ScratchpadAppPublicStart,
  ScratchpadAppSetupDependencies,
  ScratchpadAppStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ScratchpadAppPlugin(pluginInitializerContext);
