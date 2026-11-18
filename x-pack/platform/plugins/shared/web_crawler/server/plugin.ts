/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { registerWebCrawlRoutes } from './routes/web_crawl';
import type { WebCrawlerServerSetupDependencies, WebCrawlerServerStartDependencies } from './types';
import { registerWebCrawlTask } from './web_crawl/task';
import { getWebCrawlStepDefinition } from './web_crawl/workflow_step';

export class WebCrawlerPlugin
  implements
    Plugin<void, void, WebCrawlerServerSetupDependencies, WebCrawlerServerStartDependencies>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup<WebCrawlerServerStartDependencies>,
    { taskManager, workflowsExtensions }: WebCrawlerServerSetupDependencies
  ) {
    registerWebCrawlTask({ core, taskManager, logger: this.logger });
    registerWebCrawlRoutes(core.http.createRouter(), this.logger, core.getStartServices);
    workflowsExtensions?.registerStepDefinition(
      getWebCrawlStepDefinition({ getStartServices: core.getStartServices, logger: this.logger })
    );
  }

  public start() {}

  public stop() {}
}
