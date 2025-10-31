/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { OnechatRoutes } from './routes';
import type { OnechatInternalService } from '../services';
import type { OnechatStartDependencies } from '../types';
import { OnechatServicesContext } from './context/onechat_services_context';
import { PageWrapper } from './page_wrapper';

export const mountApp = async ({
  core,
  plugins,
  element,
  history,
  services,
}: {
  core: CoreStart;
  plugins: OnechatStartDependencies;
  element: HTMLElement;
  history: ScopedHistory;
  services: OnechatInternalService;
}) => {
  const kibanaServices = { ...core, plugins, appParams: { history } };
  const queryClient = new QueryClient();
  await services.accessChecker.initAccess();

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <OnechatServicesContext.Provider value={services}>
              <RedirectAppLinks coreStart={core}>
                <PageWrapper>
                  <Router history={history}>
                    <OnechatRoutes />
                  </Router>
                </PageWrapper>
              </RedirectAppLinks>
            </OnechatServicesContext.Provider>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
