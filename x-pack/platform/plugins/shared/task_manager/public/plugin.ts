/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { ManagementAppMountParams, ManagementSetup } from '@kbn/management-plugin/public';
import { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';

export interface TaskManagerPluginSetup {
  management: ManagementSetup;
}

export interface TaskManagerPluginStart {
  licensing: LicensingPluginStart;
  spaces: SpacesPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  serverless?: ServerlessPluginStart;
}

export class TaskManagerPublicPlugin
  implements Plugin<{}, {}, TaskManagerPluginSetup, TaskManagerPluginStart>
{
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: TaskManagerPluginSetup) {
    const kibanaVersion = this.initContext.env.packageInfo.version;

    plugins.management.sections.section.kibana.registerApp({
      id: 'taskManager',
      title: i18n.translate('xpack.taskManager.management.section.title', {
        defaultMessage: 'Task Manager',
      }),
      async mount(params: ManagementAppMountParams) {
        const { renderApp } = await import('./application/task_manager');

        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          TaskManagerPluginStart,
          unknown
        ];

        return renderApp({
          core: coreStart,
          plugins: pluginsStart,
          mountParams: params,
          kibanaVersion,
        });
      },
    });

    return {};
  }

  public start(core: CoreStart) {
    return {};
  }
}
