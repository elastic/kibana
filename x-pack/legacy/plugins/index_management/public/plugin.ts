/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { CoreSetup } from '../../../../../src/core/public';
import { UIM_APP_NAME } from '../common/constants';

import { AppDependencies } from './application';
import { httpService } from './application/services/http';
import { breadcrumbService } from './application/services/breadcrumbs';
import { documentationService } from './application/services/documentation';
import { notificationService } from './application/services/notification';
import { UiMetricService, setUiMetricServiceInstance } from './application/services/ui_metric';

import { IndexMgmtMetricsType } from './types';
import { MANAGEMENT_BREADCRUMB } from './_legacy';
import { ExtensionsService } from './services';

export interface IndexMgmtSetup {
  indexManagementExtensions: ExtensionsService;
}

export class IndexMgmtUIPlugin {
  private uiMetricService = new UiMetricService<IndexMgmtMetricsType>(UIM_APP_NAME);
  private extensionsService = new ExtensionsService();

  public setup(coreSetup: CoreSetup, plugins: any): IndexMgmtSetup {
    const { http, notifications, getStartServices } = coreSetup;
    const { usageCollection } = plugins;

    // Initialize services
    httpService.init(http);
    notificationService.init(notifications);
    this.uiMetricService.setup(usageCollection);
    // For now let's save the instance back in the service file until
    // we refactor the code and have the dependency injected
    setUiMetricServiceInstance(this.uiMetricService);

    plugins.management.sections.getSection('elasticsearch').registerApp({
      id: 'index_management',
      title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
      visible: true,
      order: 1,
      mount: async ({ element }: { element: HTMLElement }) => {
        const [core] = await getStartServices();
        const { chrome, docLinks } = core;

        breadcrumbService.init(chrome, MANAGEMENT_BREADCRUMB);
        documentationService.init(docLinks);

        const appDependencies: AppDependencies = {
          services: {
            uiMetric: this.uiMetricService,
            extensions: this.extensionsService,
          },
        };

        const { renderApp } = await import('./application');
        return renderApp(element, { core, dependencies: appDependencies });
      },
    });

    return {
      indexManagementExtensions: this.extensionsService,
    };
  }

  public start() {}
  public stop() {}
}
