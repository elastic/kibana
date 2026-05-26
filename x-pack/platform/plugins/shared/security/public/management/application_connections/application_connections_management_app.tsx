/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import { Router } from '@kbn/shared-ux-router';

import { labels } from './constants/i18n';
import { ApplicationConnectionsServicesContext } from './context/application_connections_services_context';
import { ApplicationConnectionsAPIClient } from './service/application_connections_api_client';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import { AuthenticationProvider } from '../../components/use_current_user';
import type { PluginStartDependencies } from '../../plugin';

interface CreateParams {
  authc: AuthenticationServiceSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const applicationConnectionsManagementApp = Object.freeze({
  id: 'application_connections',
  create({ authc, getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 25,
      title: labels.page.title,
      async mount({ element, setBreadcrumbs, history }) {
        const [[coreStart], { ApplicationConnectionsPage }] = await Promise.all([
          getStartServices(),
          import('./application_connections_page'),
        ]);

        render(
          coreStart.rendering.addContext(
            <Providers
              services={coreStart}
              authc={authc}
              history={history}
              onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
            >
              <Breadcrumb text={labels.page.title} href="/">
                <ApplicationConnectionsPage />
              </Breadcrumb>
            </Providers>
          ),
          element
        );

        return () => {
          unmountComponentAtNode(element);
        };
      },
    } as RegisterManagementAppArgs;
  },
});

export interface ProvidersProps {
  services: CoreStart;
  authc: AuthenticationServiceSetup;
  history: History;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers = ({
  services,
  authc,
  history,
  onChange,
  children,
}: PropsWithChildren<ProvidersProps>) => {
  const applicationConnectionsServices = useMemo(
    () => ({ apiClient: new ApplicationConnectionsAPIClient(services.http) }),
    [services.http]
  );
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <KibanaContextProvider services={services}>
      <AuthenticationProvider authc={authc}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <BreadcrumbsProvider onChange={onChange}>
              <ApplicationConnectionsServicesContext.Provider
                value={applicationConnectionsServices}
              >
                {children}
              </ApplicationConnectionsServicesContext.Provider>
            </BreadcrumbsProvider>
          </Router>
        </QueryClientProvider>
      </AuthenticationProvider>
    </KibanaContextProvider>
  );
};
