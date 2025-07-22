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
import { z } from '@kbn/zod';
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
    //@TODO: remove
    console.log(`--@@LLM TASKS PLUGIN SETUP`, setupDependencies);
    setupDependencies.onechat.tools.register({
      id: '.nl_to_dashboard',
      name: 'NL to Dashboard',
      meta: {
        tags: ['foo', 'bar'],
      },
      description: 'Create a dashboard from natural language',
      schema: z.object({
        indexPattern: z.string().describe('Index pattern to filter on'),
      }),
      handler: async ({ indexPattern }, { modelProvider, esClient, ...rest }) => {
        //@TODO: remove
        console.log(`--@@rest`, rest);
        const indices = await esClient.asCurrentUser.cat.indices({ index: indexPattern });

        const model = await modelProvider.getDefaultModel();
        console.log(`--@@model`, model.inferenceClient);
        // const response = await model.inferenceClient.chatComplete(somethingWith(indices));

        return response;
      },
    });


    return {};
  }

  start(core: CoreStart, startDependencies: PluginStartDependencies): LlmTasksPluginStart {
    const { inference, productDocBase } = startDependencies;
    return {
      retrieveDocumentationAvailable: async (options: { inferenceId: string }) => {
        const docBaseStatus = await startDependencies.productDocBase.management.getStatus({
          inferenceId: options.inferenceId,
        });
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
