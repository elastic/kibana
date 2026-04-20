/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { Container } from 'inversify';
import type { AppMountParameters, AppUnmount } from '@kbn/core-application-browser';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { Context } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { RulesApp } from './rules_app';
import { NotificationPoliciesApp } from './notification_policies_app';
import { EpisodesApp } from './episodes_app';
import { BreadcrumbProvider } from './breadcrumb_context';
import type { AlertEpisodesKibanaServices } from '../episodes_kibana_services';

interface AlertingV2MountParams {
  element: HTMLElement;
  history: AppMountParameters['history'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const mountAlertingV2App = async ({
  params,
  container,
  coreStart,
}: {
  params: AlertingV2MountParams;
  container: Container;
  coreStart: CoreStart;
}): Promise<AppUnmount> => {
  const { element, history, setBreadcrumbs } = params;

  const queryClient = new QueryClient();

  ReactDOM.render(
    coreStart.rendering.addContext(
      <Context.Provider value={container}>
        <QueryClientProvider client={queryClient}>
          <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
            <I18nProvider>
              <Router history={history}>
                <RulesApp />
              </Router>
            </I18nProvider>
          </BreadcrumbProvider>
        </QueryClientProvider>
      </Context.Provider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

export const mountEpisodesApp = async ({
  params,
  container,
  coreStart,
}: {
  params: ManagementAppMountParams;
  container: Container;
  coreStart: CoreStart;
}): Promise<AppUnmount> => {
  const { element, history, setBreadcrumbs } = params;

  element.classList.add(APP_WRAPPER_CLASS);

  const queryClient = new QueryClient();

  const data = container.get(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = container.get(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const expressions = container.get(PluginStart('expressions')) as ExpressionsStart;
  const uiActions = container.get(PluginStart('uiActions')) as UiActionsStart;
  const fieldFormats = container.get(PluginStart('fieldFormats')) as FieldFormatsStart;
  const lens = container.get(PluginStart('lens')) as LensPublicStart;
  const charts = container.get(PluginStart('charts')) as ChartsPluginStart;
  const share = container.get(PluginStart('share')) as SharePluginStart;

  const kibanaReactServices: AlertEpisodesKibanaServices = {
    ...coreStart,
    share,
    data,
    dataViews,
    expressions,
    uiActions,
    fieldFormats,
    lens,
    charts,
    storage: new Storage(localStorage),
    toastNotifications: coreStart.notifications.toasts,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={kibanaReactServices}>
        <Context.Provider value={container}>
          <QueryClientProvider client={queryClient}>
            <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
              <I18nProvider>
                <Router history={history}>
                  <RedirectAppLinks coreStart={coreStart}>
                    <EpisodesApp />
                  </RedirectAppLinks>
                </Router>
              </I18nProvider>
            </BreadcrumbProvider>
          </QueryClientProvider>
        </Context.Provider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};

export const mountNotificationPoliciesApp = async ({
  params,
  container,
  coreStart,
}: {
  params: AlertingV2MountParams;
  container: Container;
  coreStart: CoreStart;
}): Promise<AppUnmount> => {
  const { element, history, setBreadcrumbs } = params;

  const queryClient = new QueryClient();

  ReactDOM.render(
    coreStart.rendering.addContext(
      <Context.Provider value={container}>
        <QueryClientProvider client={queryClient}>
          <BreadcrumbProvider setBreadcrumbs={setBreadcrumbs}>
            <I18nProvider>
              <Router history={history}>
                <NotificationPoliciesApp />
              </Router>
            </I18nProvider>
          </BreadcrumbProvider>
        </QueryClientProvider>
      </Context.Provider>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
