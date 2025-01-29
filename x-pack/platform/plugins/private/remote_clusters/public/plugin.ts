/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import { Subscription } from 'rxjs';

import { PLUGIN } from '../common/constants';
import { init as initBreadcrumbs } from './application/services/breadcrumb';
import { init as initDocumentation } from './application/services/documentation';
import { init as initHttp } from './application/services/http';
import { init as initUiMetric } from './application/services/ui_metric';
import { init as initNotification } from './application/services/notification';
import { init as initRedirect } from './application/services/redirect';
import { Dependencies, ClientConfigType } from './types';
import { RemoteClustersLocatorDefinition } from './locator';

export interface RemoteClustersPluginSetup {
  isUiEnabled: boolean;
}

export class RemoteClustersUIPlugin
  implements Plugin<RemoteClustersPluginSetup, void, Dependencies, any>
{
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  private canUseApiKeyTrustModel: boolean = false;
  private licensingSubscription?: Subscription;

  setup(
    { notifications: { toasts }, http, getStartServices }: CoreSetup,
    { management, usageCollection, cloud, share }: Dependencies
  ) {
    const {
      ui: { enabled: isRemoteClustersUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isRemoteClustersUiEnabled) {
      const esSection = management.sections.section.data;

      esSection.registerApp({
        id: 'remote_clusters',
        title: i18n.translate('xpack.remoteClusters.appTitle', {
          defaultMessage: 'Remote Clusters',
        }),
        order: 7,
        mount: async ({ element, setBreadcrumbs, history }) => {
          const [core] = await getStartServices();
          const {
            chrome: { docTitle },
            docLinks,
            fatalErrors,
            executionContext,
          } = core;

          docTitle.change(PLUGIN.getI18nName());

          // Initialize services
          initBreadcrumbs(setBreadcrumbs);
          initDocumentation(docLinks);
          initUiMetric(usageCollection);
          initNotification(toasts, fatalErrors);
          initHttp(http);

          const isCloudEnabled: boolean = Boolean(cloud?.isCloudEnabled);
          const cloudBaseUrl: string = cloud?.baseUrl ?? '';
          const cloudDeploymentUrl: string = cloud?.deploymentUrl ?? '';

          const { renderApp } = await import('./application');
          const unmountAppCallback = await renderApp(
            element,
            {
              isCloudEnabled,
              cloudBaseUrl,
              cloudDeploymentUrl,
              executionContext,
              canUseAPIKeyTrustModel: this.canUseApiKeyTrustModel,
            },
            history,
            core
          );

          return () => {
            docTitle.reset();
            unmountAppCallback();
          };
        },
      });

      share.url.locators.create(
        new RemoteClustersLocatorDefinition({
          managementAppLocator: management.locator,
        })
      );
    }

    return {
      isUiEnabled: isRemoteClustersUiEnabled,
    };
  }

  start({ application }: CoreStart, { licensing }: Dependencies) {
    const {
      ui: { enabled: isRemoteClustersUiEnabled },
    } = this.initializerContext.config.get<ClientConfigType>();

    if (isRemoteClustersUiEnabled) {
      initRedirect(application.navigateToApp);
    }

    this.licensingSubscription = licensing.license$.subscribe((next) => {
      this.canUseApiKeyTrustModel = next.hasAtLeast('enterprise');
    });
  }

  stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
