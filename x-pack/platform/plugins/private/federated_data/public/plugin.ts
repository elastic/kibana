/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { i18n } from '@kbn/i18n';
import type { SetupDependencies, StartDependencies, DatasetsPluginStart } from './types';

const PLUGIN_NAME = i18n.translate('dataFederation.pluginName', {
  defaultMessage: 'ES|QL Data Federation',
});

const LIST_BREADCRUMB = [
  {
    text: PLUGIN_NAME,
    href: '#/management/kibana/data_federation',
  },
];

export class DatasetsPlugin
  implements Plugin<void, DatasetsPluginStart, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { management }: SetupDependencies): void {
    management.sections.section.data.registerApp({
      id: 'data_federation',
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
        });
        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });
  }

  public start(): DatasetsPluginStart {
    return {};
  }
}
