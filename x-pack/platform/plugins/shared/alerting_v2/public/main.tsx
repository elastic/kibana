/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { inject, injectable } from 'inversify';
import type { Container } from 'inversify';
import type {
  AppDeepLinkLocations,
  AppMountParameters,
  AppUnmount,
} from '@kbn/core-application-browser';
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { ApplicationParameters, Context, CoreStart } from '@kbn/core-di-browser';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { ALERTING_V2_RULES_APP_ID } from './constants';
import { RulesApp } from './application/rules_app';
import { NotificationPoliciesApp } from './application/notification_policies_app';
import { BreadcrumbProvider } from './application/breadcrumb_context';

@injectable()
export class AlertingV2App {
  public static id = ALERTING_V2_RULES_APP_ID;
  public static title = 'Rules';
  public static appRoute = `/${ALERTING_V2_RULES_APP_ID}`;
  public static visibleIn: AppDeepLinkLocations[] = ['sideNav'];
  public static category = DEFAULT_APP_CATEGORIES.management;

  constructor(
    @inject(ApplicationParameters) private readonly params: AppMountParameters,
    @inject(CoreStart('injection')) private readonly di: CoreDiServiceStart,
    @inject(CoreStart('chrome'))
    private readonly chrome: { setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void }
  ) {}

  public mount(): AppUnmount {
    return mountAlertingV2App({
      params: {
        element: this.params.element,
        history: this.params.history,
        setBreadcrumbs: this.chrome.setBreadcrumbs,
      },
      container: this.di.getContainer(),
    });
  }
}

interface AlertingV2MountParams {
  element: HTMLElement;
  history: AppMountParameters['history'];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
}

export const mountAlertingV2App = ({
  params,
  container,
}: {
  params: AlertingV2MountParams;
  container: Container;
}): AppUnmount => {
  const { element, history, setBreadcrumbs } = params;

  const queryClient = new QueryClient();

  ReactDOM.render(
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
    </Context.Provider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

export const mountNotificationPoliciesApp = ({
  params,
  container,
}: {
  params: AlertingV2MountParams;
  container: Container;
}): AppUnmount => {
  const { element, history, setBreadcrumbs } = params;

  const queryClient = new QueryClient();

  ReactDOM.render(
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
    </Context.Provider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
