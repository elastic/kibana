/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SetupDependencies, StartDependencies, FederatedDataPluginStart } from './types';

const PLUGIN_NAME = i18n.translate('dataFederation.pluginName', {
  defaultMessage: 'ES|QL Data Federation',
});

const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/kibana/data_federation',
  },
];

export class FederatedDataPlugin
  implements Plugin<void, FederatedDataPluginStart, SetupDependencies, StartDependencies>
{
  private readonly enableFederatedIdentityAuth: boolean;
  private readonly enableGoogleCloudStorageDataSourceType: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    const { enableFederatedIdentityAuth, enableGoogleCloudStorageDataSourceType } =
      initializerContext.config.get<{
        enableFederatedIdentityAuth: boolean;
        enableGoogleCloudStorageDataSourceType: boolean;
      }>();
    this.enableFederatedIdentityAuth = enableFederatedIdentityAuth;
    this.enableGoogleCloudStorageDataSourceType = enableGoogleCloudStorageDataSourceType;
  }

  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    const enableFederatedIdentityAuth = this.enableFederatedIdentityAuth;
    const enableGoogleCloudStorageDataSourceType = this.enableGoogleCloudStorageDataSourceType;
    management.sections.section.data.registerApp({
      id: 'federated_data',
      title: PLUGIN_NAME,
      order: 2,
      async mount(params: ManagementAppMountParams) {
        const { mountManagementSection } = await import('./mount_management_section');
        const [coreStart, pluginsStart] = await core.getStartServices();

        const { docTitle } = coreStart.chrome;
        docTitle.change(PLUGIN_NAME);

        const { setBreadcrumbs } = params;
        setBreadcrumbs(LIST_BREADCRUMB);

        const unmountAppCallback = mountManagementSection(coreStart, params, {
          cloud: pluginsStart.cloud,
          featureFlags: { enableFederatedIdentityAuth, enableGoogleCloudStorageDataSourceType },
        });
        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });
  }

  public start(): FederatedDataPluginStart {
    return {};
  }
}
