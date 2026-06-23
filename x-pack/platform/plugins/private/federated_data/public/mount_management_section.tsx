/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { Router } from '@kbn/shared-ux-router';

import { Main } from './main';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, history }: ManagementAppMountParams,
  {
    cloud,
    enableFederatedIdentityAuth: enableFederatedIdentityAuthConfig = true,
  }: { cloud?: CloudStart; enableFederatedIdentityAuth?: boolean }
) => {
  const enableFederatedIdentityAuth =
    Boolean(cloud?.isCloudEnabled) && enableFederatedIdentityAuthConfig;

  ReactDOM.render(
    coreStart.rendering.addContext(
      <Router history={history}>
        <Main
          httpClient={coreStart.http}
          toasts={coreStart.notifications.toasts}
          enableFederatedIdentityAuth={enableFederatedIdentityAuth}
        />
      </Router>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
