/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { HttpStart as Http, ToastsSetup } from '@kbn/core/public';
import { RouteComponentProps } from 'react-router-dom';

import { LicenseStatus } from '../../common';
import { KibanaRenderContextProvider } from '../shared_imports';
import { App } from './app';
import { AppContextProvider } from './contexts/app_context';
import { ProfileContextProvider } from './contexts/profiler_context';
import { SearchProfilerStartServices } from '../types';

interface AppDependencies {
  el: HTMLElement;
  http: Http;
  notifications: ToastsSetup;
  initialLicenseStatus: LicenseStatus;
  location: RouteComponentProps['location'];
  startServices: SearchProfilerStartServices;
}

export const renderApp = ({
  el,
  http,
  notifications,
  initialLicenseStatus,
  location,
  startServices,
}: AppDependencies) => {
  render(
    <KibanaRenderContextProvider {...startServices}>
      <AppContextProvider
        args={{ initialLicenseStatus, notifications, http, location, ...startServices }}
      >
        <ProfileContextProvider>
          <App />
        </ProfileContextProvider>
      </AppContextProvider>
    </KibanaRenderContextProvider>,
    el
  );

  return () => unmountComponentAtNode(el);
};
