/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import React from 'react';
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import {
  BreadcrumbsContextProvider,
  RouteRenderer,
  RouterProvider,
} from '@kbn/typed-react-router-config';
import { StreamsAppContextProvider } from '../streams_app_context_provider';
import { streamsAppRouter } from '../../routes/config';
import { StreamsAppStartDependencies } from '../../types';
import { StreamsAppServices } from '../../services/types';
import { KbnUrlStateStorageFromRouterProvider } from '../../util/kbn_url_state_context';

export function AppRoot({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
  isServerless,
}: {
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
  services: StreamsAppServices;
  isServerless: boolean;
} & { appMountParameters: AppMountParameters }) {
  const { history } = appMountParameters;

  const context = {
    appParams: appMountParameters,
    core: coreStart,
    dependencies: {
      start: pluginsStart,
    },
    services,
    isServerless,
  };

  return (
    <StreamsAppContextProvider context={context}>
      <RedirectAppLinks coreStart={coreStart}>
        <RouterProvider history={history} router={streamsAppRouter}>
          <KbnUrlStateStorageFromRouterProvider>
            <BreadcrumbsContextProvider>
              <RouteRenderer />
            </BreadcrumbsContextProvider>
          </KbnUrlStateStorageFromRouterProvider>
        </RouterProvider>
      </RedirectAppLinks>
    </StreamsAppContextProvider>
  );
}
