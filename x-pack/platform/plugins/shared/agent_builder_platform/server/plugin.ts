/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { PluginConfig } from './config';
import type {
  PluginSetupDependencies,
  PluginStartDependencies,
  AgentBuilderPlatformPluginSetup,
  AgentBuilderPlatformPluginStart,
} from './types';
import { registerTools } from './tools';
import { registerAttachmentTypes } from './attachment_types';

export class AgentBuilderPlatformPlugin
  implements
    Plugin<
      AgentBuilderPlatformPluginSetup,
      AgentBuilderPlatformPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  // @ts-expect-error unused for now
  private logger: Logger;
  // @ts-expect-error unused for now
  private config: AgentBuilderConfig;

  constructor(context: PluginInitializerContext<PluginConfig>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>,
    setupDeps: PluginSetupDependencies
  ): AgentBuilderPlatformPluginSetup {
    registerTools({
      coreSetup,
      setupDeps,
    });
    registerAttachmentTypes({
      coreSetup,
      setupDeps,
    });

    return {};
  }

  start(coreStart: CoreStart, startDeps: PluginStartDependencies): AgentBuilderPlatformPluginStart {
    return {};
  }

  stop() {}
}
