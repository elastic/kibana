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

import { Main } from './main';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element }: ManagementAppMountParams,
  { cloud }: { cloud?: CloudStart }
) => {
  const enableFederatedIdentityAuth = true; // Boolean(cloud?.isCloudEnabled);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <Main
        httpClient={coreStart.http}
        toasts={coreStart.notifications.toasts}
        enableFederatedIdentityAuth={enableFederatedIdentityAuth}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
