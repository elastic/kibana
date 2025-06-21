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

import type { ChangeRequestsRepositoryClient } from '@kbn/change-requests-plugin/public';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';

import { ChangeRequestsPage } from './change_requests_page';
import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';

interface CreateParams {
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
  getChangeRequestsRepositoryClient: () => ChangeRequestsRepositoryClient | undefined;
}

export const changeRequestsManagementApp = Object.freeze({
  id: 'change_requests',
  create({ getStartServices, getChangeRequestsRepositoryClient }: CreateParams) {
    const title = i18n.translate('xpack.security.management.changeRequestsTitle', {
      defaultMessage: 'Change requests',
    });
    return {
      id: this.id,
      order: 100,
      title,
      async mount({ element, setBreadcrumbs, history }) {
        const [coreStart] = await getStartServices();
        const client = getChangeRequestsRepositoryClient();

        if (!client) {
          return null;
        }

        // Should probably hide this whole page and nav link if the user doesn't have the create capability either

        render(
          coreStart.rendering.addContext(
            <Providers
              services={coreStart}
              history={history}
              onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
            >
              <Breadcrumb
                text={i18n.translate('xpack.security.changeRequests.breadcrumb', {
                  defaultMessage: 'Change requests',
                })}
                href="/"
              >
                <Routes>
                  <Route path={['/', '']} exact>
                    <ChangeRequestsPage
                      changeRequestsRepositoryClient={client}
                      coreStart={coreStart}
                      canManage={
                        coreStart.application.capabilities.change_requests.manage as boolean
                      }
                    />
                  </Route>
                </Routes>
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

export const Providers: FC<PropsWithChildren<ProvidersProps>> = ({
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
