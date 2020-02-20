/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup } from '../../../../../src/core/public';
import { UsageCollectionSetup } from '../../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../../src/plugins/management/public';
import { UIM_APP_NAME } from '../common/constants';

import { AppDependencies } from './application';
import { httpService } from './application/services/http';
import { breadcrumbService } from './application/services/breadcrumbs';
import { documentationService } from './application/services/documentation';
import { notificationService } from './application/services/notification';
import { UiMetricService } from './application/services/ui_metric';

import { setExtensionsService } from './application/store/selectors';
import { setUiMetricService } from './application/services/api';

import { IndexMgmtMetricsType } from './types';
import { ExtensionsService, ExtensionsSetup } from './services';

export interface IndexMgmtSetup {
  extensionsService: ExtensionsSetup;
}

interface PluginsDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export class IndexMgmtUIPlugin {
  private uiMetricService = new UiMetricService<IndexMgmtMetricsType>(UIM_APP_NAME);
  private extensionsService = new ExtensionsService();

  constructor() {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
    setUiMetricService(this.uiMetricService);
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies): IndexMgmtSetup {
    const { http, notifications, getStartServices } = coreSetup;
    const { usageCollection, management } = plugins;

    httpService.setup(http);
    notificationService.setup(notifications);
    this.uiMetricService.setup(usageCollection);

    management.sections.getSection('elasticsearch')!.registerApp({
      id: 'index_management',
      title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
      order: 1,
      mount: async ({ element, setBreadcrumbs }) => {
        const [core] = await getStartServices();
        const { docLinks, fatalErrors } = core;

        breadcrumbService.setup(setBreadcrumbs);
        documentationService.setup(docLinks);

        const appDependencies: AppDependencies = {
          core: {
            fatalErrors,
          },
          plugins: {
            usageCollection,
          },
          services: {
            uiMetricService: this.uiMetricService,
            extensionsService: this.extensionsService,
            httpService,
            notificationService,
          },
        };

        const { renderApp } = await import('./application');
        return renderApp(element, { core, dependencies: appDependencies });
      },
    });

    return {
      extensionsService: this.extensionsService.setup(),
    };
  }

  public start() {}
  public stop() {}
}
