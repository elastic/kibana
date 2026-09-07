/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { CloudConnectedAppContextProvider } from './app_context';
import { CloudConnectedAppMain } from './app';
import type { CloudConnectedAppComponentProps, CloudConnectedStartDeps } from '../types';
import type { CloudConnectTelemetryService } from '../telemetry/client';
import type { CloudConnectApiService } from '../lib/api';

const CloudConnectedAppComponent: React.FC<CloudConnectedAppComponentProps> = ({
  chrome,
  application,
  http,
  docLinks,
  notifications,
  history,
  cloudUrl,
  telemetryService,
  apiService,
  licensing,
}) => {
  const [justConnected, setJustConnected] = useState(false);
  const [autoEnablingEis, setAutoEnablingEis] = useState(false);
  const hasConfigurePermission = application.capabilities.cloudConnect?.configure === true;

  return (
    <CloudConnectedAppContextProvider
      value={{
        chrome,
        application,
        http,
        docLinks,
        notifications,
        history,
        cloudUrl,
        telemetryService,
        apiService,
        licensing,
        justConnected,
        setJustConnected,
        autoEnablingEis,
        setAutoEnablingEis,
        hasConfigurePermission,
      }}
    >
      <CloudConnectedAppMain />
    </CloudConnectedAppContextProvider>
  );
};

export const CloudConnectedApp = (
  core: CoreStart,
  plugins: CloudConnectedStartDeps,
  params: AppMountParameters,
  cloudUrl: string,
  telemetryService: CloudConnectTelemetryService,
  apiService: CloudConnectApiService
) => {
  ReactDOM.render(
    core.rendering.addContext(
      <CloudConnectedAppComponent
        chrome={core.chrome}
        application={core.application}
        http={core.http}
        docLinks={core.docLinks}
        notifications={core.notifications}
        history={params.history}
        cloudUrl={cloudUrl}
        telemetryService={telemetryService}
        apiService={apiService}
        licensing={plugins.licensing}
      />
    ),
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
