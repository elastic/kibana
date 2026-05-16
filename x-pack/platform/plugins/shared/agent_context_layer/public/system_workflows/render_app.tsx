/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SystemWorkflowsApp } from './app';

export interface RenderAppParams {
  coreStart: CoreStart;
  params: ManagementAppMountParams;
  canManage: boolean;
}

export const renderApp = ({ coreStart, params, canManage }: RenderAppParams) => {
  params.setBreadcrumbs([
    {
      text: i18n.translate('xpack.agentContextLayer.management.breadcrumb', {
        defaultMessage: 'Agent Context Layer',
      }),
    },
  ]);

  ReactDOM.render(
    <KibanaContextProvider services={coreStart}>
      <I18nProvider>
        <SystemWorkflowsApp
          http={coreStart.http}
          application={coreStart.application}
          notifications={coreStart.notifications}
          canManage={canManage}
        />
      </I18nProvider>
    </KibanaContextProvider>,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
