/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { CreateDataSourceFlyout } from './create_data_source_flyout';
import type { DataSourceManagementPluginStart } from './plugin_start_contract';
import type { SetupDependencies, StartDependencies } from './types';

export class DataSourceManagementPlugin
  implements Plugin<void, DataSourceManagementPluginStart, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      /** Listed immediately after Index Management (0) in the Data sidebar. */
      order: 1,
      /** Old Stack Management path before this app moved to the Data section. */
      redirectFrom: 'kibana/data_source_management',
      async mount(params: ManagementAppMountParams) {
        const { mountManagementSection } = await import('./mount_management_section');
        const [coreStart] = await core.getStartServices();

        const unmountAppCallback = mountManagementSection(coreStart, params);
        return () => {
          unmountAppCallback();
        };
      },
    });
  }

  public start(): DataSourceManagementPluginStart {
    return {
      CreateDataSourceFlyout,
    };
  }
}
