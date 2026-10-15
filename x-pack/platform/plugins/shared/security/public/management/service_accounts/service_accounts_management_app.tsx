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

import type { BuildFlavor } from '@kbn/config';
import type { CoreStart, StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { RegisterManagementAppArgs } from '@kbn/management-plugin/public';
import { Router } from '@kbn/shared-ux-router';
import { assertNever } from '@kbn/std';

import type { BreadcrumbsChangeHandler } from '../../components/breadcrumb';
import {
  Breadcrumb,
  BreadcrumbsProvider,
  createBreadcrumbsChangeHandler,
} from '../../components/breadcrumb';
import type { PluginStartDependencies } from '../../plugin';
import type { ServiceAccountsAPIClient } from '../../service_accounts';

interface CreateParams {
  buildFlavor: BuildFlavor;
  roleManagementEnabled: boolean;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
  serviceAccountsAPIClient: ServiceAccountsAPIClient;
}

export const serviceAccountsManagementApp = Object.freeze({
  id: 'service_accounts',
  create({
    buildFlavor,
    roleManagementEnabled,
    getStartServices,
    serviceAccountsAPIClient,
  }: CreateParams) {
    const title = i18n.translate('xpack.security.management.serviceAccountsTitle', {
      defaultMessage: 'Service accounts',
    });

    return {
      id: this.id,
      order: 35,
      title,
      async mount({ element, setBreadcrumbs, history }) {
        const [[coreStart], { ServiceAccountsApp }, { RolesAPIClient }] = await Promise.all([
          getStartServices(),
          import('./service_accounts_app'),
          import('../roles/roles_api_client'),
        ]);
        const canCreate = coreStart.security.serviceAccounts.canCreate();
        const rolesAPIClient = new RolesAPIClient(coreStart.http);
        const createRoleUrl =
          roleManagementEnabled && coreStart.application.capabilities.roles?.save
            ? coreStart.application.getUrlForApp('management', { path: '/security/roles/edit' })
            : undefined;

        render(
          coreStart.rendering.addContext(
            <Providers
              services={coreStart}
              history={history}
              onChange={createBreadcrumbsChangeHandler(coreStart.chrome, setBreadcrumbs)}
            >
              <Breadcrumb text={title} href="/">
                <ServiceAccountsApp
                  isServerless={buildFlavor === 'serverless'}
                  canCreate={canCreate}
                  serviceAccountsAPIClient={serviceAccountsAPIClient}
                  rolesAPIClient={rolesAPIClient}
                  createRoleUrl={createRoleUrl}
                  onCreated={({ name }) => {
                    coreStart.notifications.toasts.addSuccess(
                      i18n.translate(
                        'xpack.security.management.serviceAccounts.create.successTitle',
                        {
                          defaultMessage: 'Created service account "{name}"',
                          values: { name },
                        }
                      )
                    );
                  }}
                  onDeleted={({ name }, outcome) => {
                    const { toasts } = coreStart.notifications;
                    switch (outcome.status) {
                      case 'already_deleted':
                        toasts.addInfo(
                          i18n.translate(
                            'xpack.security.management.serviceAccounts.delete.alreadyDeletedTitle',
                            {
                              defaultMessage: 'Service account "{name}" was already deleted',
                              values: { name },
                            }
                          )
                        );
                        return;
                      case 'deleted':
                        if (outcome.warnings.length === 0) {
                          toasts.addSuccess(
                            i18n.translate(
                              'xpack.security.management.serviceAccounts.delete.successTitle',
                              {
                                defaultMessage: 'Deleted service account "{name}"',
                                values: { name },
                              }
                            )
                          );
                          return;
                        }
                        toasts.addWarning({
                          title: i18n.translate(
                            'xpack.security.management.serviceAccounts.delete.warningTitle',
                            {
                              defaultMessage: 'Deleted service account "{name}" with warnings',
                              values: { name },
                            }
                          ),
                          text: outcome.warnings.join(' '),
                        });
                        return;
                      default:
                        assertNever(outcome);
                    }
                  }}
                  onDeleteError={(error, errorTitle) => {
                    coreStart.notifications.toasts.addError(error, { title: errorTitle });
                  }}
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
