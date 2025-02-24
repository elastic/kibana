/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HttpSetup } from '@kbn/core/public';
import {
  notificationServiceMock,
  fatalErrorsServiceMock,
  docLinksServiceMock,
} from '@kbn/core/public/mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { AppContextProvider } from '../../../public/application/app_context';

import { init as initBreadcrumb } from '../../../public/application/services/breadcrumb';
import { init as initHttp } from '../../../public/application/services/http';
import { init as initNotification } from '../../../public/application/services/notification';
import { init as initUiMetric } from '../../../public/application/services/ui_metric';
import { init as initDocumentation } from '../../../public/application/services/documentation';
import { init as initHttpRequests } from './http_requests';

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, overrides: Record<string, unknown> = {}) =>
  (props: Record<string, unknown>) => {
    const { isCloudEnabled, ...rest } = props;
    initHttp(httpSetup);

    return (
      <AppContextProvider
        context={{
          isCloudEnabled: !!isCloudEnabled,
          cloudBaseUrl: 'test.com',
          cloudDeploymentUrl: 'deployment.com',
          executionContext: executionContextServiceMock.createStartContract(),
          canUseAPIKeyTrustModel: true,
          ...overrides,
        }}
      >
        <Comp {...rest} />
      </AppContextProvider>
    );
  };

export const setupEnvironment = () => {
  initBreadcrumb(() => {});
  initDocumentation(docLinksServiceMock.createStartContract());
  initUiMetric(usageCollectionPluginMock.createSetupContract());
  initNotification(
    notificationServiceMock.createSetupContract().toasts,
    fatalErrorsServiceMock.createSetupContract()
  );

  return initHttpRequests();
};
