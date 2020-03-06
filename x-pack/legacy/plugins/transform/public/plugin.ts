/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { renderApp } from './app/app';
import { ShimCore, ShimPlugins } from './shim';

import { breadcrumbService } from './app/services/navigation';
import { docTitleService } from './app/services/navigation';
import { textService } from './app/services/text';
import { uiMetricService } from './app/services/ui_metric';

export class Plugin {
  public start(core: ShimCore, plugins: ShimPlugins): void {
    const {
      http,
      chrome,
      documentation,
      docLinks,
      docTitle,
      injectedMetadata,
      notifications,
      uiSettings,
      savedObjects,
      overlays,
    } = core;
    const { data, management, uiMetric } = plugins;

    // AppCore/AppPlugins to be passed on as React context
    const appDependencies = {
      core: {
        chrome,
        documentation,
        docLinks,
        http,
        i18n: core.i18n,
        injectedMetadata,
        notifications,
        uiSettings,
        savedObjects,
        overlays,
      },
      plugins: {
        data,
        management,
      },
    };

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    if (esSection !== undefined) {
      esSection.registerApp({
        id: 'transform',
        title: i18n.translate('xpack.transform.appTitle', {
          defaultMessage: 'Transforms',
        }),
        order: 3,
        mount(params) {
          breadcrumbService.setup(params.setBreadcrumbs);
          params.setBreadcrumbs([
            {
              text: i18n.translate('xpack.transform.breadcrumbsTitle', {
                defaultMessage: 'Transforms',
              }),
            },
          ]);

          return renderApp(params.element, appDependencies);
        },
      });
    }

    // Initialize services
    textService.init();
    uiMetricService.init(uiMetric.createUiStatsReporter);
    docTitleService.init(docTitle.change);
  }
}
