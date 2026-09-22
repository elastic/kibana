/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { Router } from '@kbn/shared-ux-router';

import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';
import type { ServiceAccountsAPIClient } from '../../service_accounts';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
  serviceAccountsAPIClient: ServiceAccountsAPIClient;
}

export const serviceAccountsManagementApp = Object.freeze({
  id: 'service_accounts',
  create({ getStartServices, serviceAccountsAPIClient }: CreateParams) {
    const title = i18n.translate('xpack.security.management.serviceAccountsTitle', {
      defaultMessage: 'Service accounts',
    });

    return {
      id: this.id,
      order: 35,
      title,
      async mount({ element, setBreadcrumbs, history }) {
        const [[coreStart], { ServiceAccountsPage }] = await Promise.all([
          getStartServices(),
          import('./service_accounts_page'),
        ]);
        const canCreate = coreStart.security.serviceAccounts.canCreate();

        render(
          coreStart.rendering.addContext(
            <Providers
              services={coreStart}
              history={history}
              onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
            >
              <Breadcrumb text={title} href="/">
                <ServiceAccountsPage
                  canCreate={canCreate}
                  serviceAccountsAPIClient={serviceAccountsAPIClient}
                  onCreateAccount={() => history.push('/create')}
                />
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

interface ProvidersProps {
  services: CoreStart;
  history: History;
  onChange?: BreadcrumbsChangeHandler;
}

const Providers: FC<PropsWithChildren<ProvidersProps>> = ({
  services,
  history,
  onChange,
  children,
}) => (
  <KibanaContextProvider services={services}>
    <Router history={history}>
      <BreadcrumbsProvider onChange={onChange}>{children}</BreadcrumbsProvider>
    </Router>
  </KibanaContextProvider>
);
