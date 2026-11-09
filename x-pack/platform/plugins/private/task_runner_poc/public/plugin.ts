/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

/** The part of `task_runner_poc` config the server exposes to the browser. */
export interface TaskRunnerPocPublicConfig {
  projectId: string;
}

export interface TaskRunnerPocStartDependencies {
  share: SharePluginStart;
}

export class TaskRunnerPocPublicPlugin
  implements Plugin<void, void, object, TaskRunnerPocStartDependencies>
{
  private readonly projectId: string;

  constructor(initializerContext: PluginInitializerContext<TaskRunnerPocPublicConfig>) {
    this.projectId = initializerContext.config.get().projectId;
  }

  public setup(core: CoreSetup<TaskRunnerPocStartDependencies>) {
    const projectId = this.projectId;
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.management,
      euiIconType: 'clock',
      order: 9030,
      mount: async (params: AppMountParameters) => {
        const [coreStart, { share }] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({ coreStart, share, projectId }, params);
      },
    });
  }

  public start() {}

  public stop() {}
}
