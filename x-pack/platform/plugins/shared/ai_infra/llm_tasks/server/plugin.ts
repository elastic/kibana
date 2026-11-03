/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { LlmTasksConfig } from './config';
import type {
  LlmTasksPluginSetup,
  LlmTasksPluginStart,
  PluginSetupDependencies,
  PluginStartDependencies,
} from './types';
import { createLlmTasksStart } from './create_llm_tasks_start';

export class LlmTasksPlugin
  implements
    Plugin<
      LlmTasksPluginSetup,
      LlmTasksPluginStart,
      PluginSetupDependencies,
      PluginStartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext<LlmTasksConfig>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<PluginStartDependencies, LlmTasksPluginStart>,
    setupDependencies: PluginSetupDependencies
  ): LlmTasksPluginSetup {
    return {};
  }

  start(core: CoreStart, startDependencies: PluginStartDependencies): LlmTasksPluginStart {
    const { inference, productDocBase } = startDependencies;
    return createLlmTasksStart({ inference, productDocBase, logger: this.logger });
  }
}
