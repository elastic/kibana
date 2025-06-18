/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { OnechatRoutes } from './routes';
import { OneChatServicesContext } from './context/onechat_services_context';
import type { OnechatInternalService } from '../services';
import { InitialMessageProvider } from './context/initial_message_context';

export const renderApp = async ({
  core,
  element,
  history,
  services,
}: {
  core: CoreStart;
  element: HTMLElement;
  history: ScopedHistory;
  services: OnechatInternalService;
}) => {
  const queryClient = new QueryClient();

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <OneChatServicesContext.Provider value={services}>
              <InitialMessageProvider>
                <RedirectAppLinks coreStart={core}>
                  <Router history={history}>
                    <OnechatRoutes />
                  </Router>
                </RedirectAppLinks>
              </InitialMessageProvider>
            </OneChatServicesContext.Provider>
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
