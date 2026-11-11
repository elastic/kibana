/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { AppDeps } from './app';
import { App } from './app';
import { setHttpClient } from './lib/api';

interface BootDeps extends AppDeps {
  element: HTMLElement;
  rendering: CoreStart['rendering'];
}

export const renderApp = (bootDeps: BootDeps) => {
  const { element, rendering, ...appDeps } = bootDeps;

  setHttpClient(appDeps.http);

  render(
    rendering.addContext(
      <KibanaContextProvider
        services={{
          uiSettings: bootDeps.uiSettings,
          settings: bootDeps.settings,
          theme: bootDeps.theme,
        }}
      >
        <App {...appDeps} />
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    unmountComponentAtNode(element);
  };
};
