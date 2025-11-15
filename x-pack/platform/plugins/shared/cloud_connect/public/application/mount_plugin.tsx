/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { CloudConnectedAppContextProvider } from './app_context';
import { CloudConnectedAppMain } from './app';
import type { CloudConnectedAppComponentProps } from '../types';

const CloudConnectedAppComponent: React.FC<CloudConnectedAppComponentProps> = ({
  chrome,
  application,
  http,
  docLinks,
  notifications,
  history,
}) => {
  return (
    <CloudConnectedAppContextProvider
      value={{ chrome, application, http, docLinks, notifications, history }}
    >
      <CloudConnectedAppMain />
    </CloudConnectedAppContextProvider>
  );
};

export const CloudConnectedApp = (core: CoreStart, params: AppMountParameters) => {
  ReactDOM.render(
    core.rendering.addContext(
      <CloudConnectedAppComponent
        chrome={core.chrome}
        application={core.application}
        http={core.http}
        docLinks={core.docLinks}
        notifications={core.notifications}
        history={params.history}
      />
    ),
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
