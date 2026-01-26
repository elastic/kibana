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
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { ApplicationParameters, Context, CoreStart } from '@kbn/core-di-browser';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { ALERTING_V2_APP_ID, ALERTING_V2_APP_ROUTE } from './constants';
import { App } from './components/app';

@injectable()
export class AlertingV2App {
  public static id = ALERTING_V2_APP_ID;
  public static title = 'Rules V2';
  public static appRoute = ALERTING_V2_APP_ROUTE;
  public static visibleIn: AppDeepLinkLocations[] = ['sideNav'];
  public static category = DEFAULT_APP_CATEGORIES.management;

  constructor(
    @inject(ApplicationParameters) private readonly params: AppMountParameters,
    @inject(CoreStart('injection')) private readonly di: CoreDiServiceStart
  ) {}

  public mount(): AppUnmount {
    return mountAlertingV2App({ params: this.params, container: this.di.getContainer() });
  }
}

type AlertingV2MountParams = Pick<AppMountParameters, 'element' | 'history'>;

export const mountAlertingV2App = ({
  params,
  container,
}: {
  params: AlertingV2MountParams;
  container: Container;
}): AppUnmount => {
  const { element, history } = params;

  ReactDOM.render(
    <Context.Provider value={container}>
      <I18nProvider>
        <Router history={history}>
          <App />
        </Router>
      </I18nProvider>
    </Context.Provider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
