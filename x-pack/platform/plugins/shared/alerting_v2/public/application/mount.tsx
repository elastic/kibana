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
import { Context } from '@kbn/core-di-browser';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { RulesApp } from './rules_app';
import { NotificationPoliciesApp } from './notification_policies_app';
import { BreadcrumbProvider } from './breadcrumb_context';

interface AlertingV2MountParams {
  element: HTMLElement;
  history: AppMountParameters['history'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const mountAlertingV2App = ({
  params,
  container,
  coreStart,
}: {
  params: AlertingV2MountParams;
  container: Container;
  coreStart: CoreStart;
}): AppUnmount => {
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

export const mountNotificationPoliciesApp = ({
  params,
  container,
  coreStart,
}: {
  params: AlertingV2MountParams;
  container: Container;
  coreStart: CoreStart;
}): AppUnmount => {
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
