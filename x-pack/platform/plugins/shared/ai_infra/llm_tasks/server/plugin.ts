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
import { retrieveDocumentation } from './tasks';

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
    return {
      retrieveDocumentationAvailable: async () => {
        const docBaseStatus = await startDependencies.productDocBase.management.getStatus();
        return docBaseStatus.status === 'installed';
      },
      retrieveDocumentation: (options) => {
        return retrieveDocumentation({
          outputAPI: inference.getClient({ request: options.request }).output,
          searchDocAPI: productDocBase.search,
          logger: this.logger.get('tasks.retrieve-documentation'),
        })(options);
      },
    };
  }
}
