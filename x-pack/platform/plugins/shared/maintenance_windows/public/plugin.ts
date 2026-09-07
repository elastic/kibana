/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
import { MAINTENANCE_WINDOWS_APP_ID } from '../common';
import type {
  MaintenanceWindowsPublicSetupDependencies,
  MaintenanceWindowsPublicStartDependencies,
} from './types';
export class MaintenanceWindowsPublicPlugin
  implements
    Plugin<
      void,
      void,
      MaintenanceWindowsPublicSetupDependencies,
      MaintenanceWindowsPublicStartDependencies
    >
{
  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, plugins: MaintenanceWindowsPublicSetupDependencies) {
    const kibanaVersion = this.initContext.env.packageInfo.version;
    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: MAINTENANCE_WINDOWS_APP_ID,
      title: i18n.translate('xpack.maintenanceWindows.management.section.title', {
        defaultMessage: 'Maintenance Windows',
      }),
      async mount(params: ManagementAppMountParams) {
        const { renderApp } = await import('./application');

        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          MaintenanceWindowsPublicStartDependencies,
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

    return;
  }

  public start(): void {}

  public stop(): void {}
}
