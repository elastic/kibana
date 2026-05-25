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
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';

import { ApplicationConnectionsServicesContext } from './context/application_connections_services_context';
import { ApplicationConnectionsAPIClient } from './service/application_connections_api_client';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const applicationConnectionsManagementApp = Object.freeze({
  id: 'application_connections',
  create({ getStartServices }: CreateParams) {
    return {
      id: this.id,
      order: 25,
      title: i18n.translate('xpack.security.management.applicationConnectionsTitle', {
        defaultMessage: 'Application connections',
      }),
      async mount({ element, setBreadcrumbs, history }) {
        const [[coreStart], { ApplicationConnectionsPage }] = await Promise.all([
          getStartServices(),
          import('./application_connections_page'),
        ]);

        render(
          coreStart.rendering.addContext(
            <Providers
              services={coreStart}
              history={history}
              onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
            >
              <Breadcrumb
                text={i18n.translate('xpack.security.management.applicationConnectionsTitle', {
                  defaultMessage: 'Application connections',
                })}
                href="/"
              >
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
  history: History;
  onChange?: BreadcrumbsChangeHandler;
}

export const Providers = ({
  services,
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
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <BreadcrumbsProvider onChange={onChange}>
            <ApplicationConnectionsServicesContext.Provider value={applicationConnectionsServices}>
              {children}
            </ApplicationConnectionsServicesContext.Provider>
          </BreadcrumbsProvider>
        </Router>
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};
