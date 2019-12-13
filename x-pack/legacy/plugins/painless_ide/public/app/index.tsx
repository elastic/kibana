/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './app';
import { getAppProviders } from './app_context';

import { Core } from '../legacy';

export { BASE_PATH, REACT_ROOT_ID } from './constants';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { createKibanaReactContext } from '../../../../../../src/plugins/kibana_react/public';

export const mountReactApp = (elem: HTMLElement | null, { core }: { core: Core }): void => {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: core.uiSettings,
  });
  if (elem) {
    const AppProviders = getAppProviders({ core });
    render(
      <KibanaReactContextProvider>
        <AppProviders>
          <App />
        </AppProviders>
      </KibanaReactContextProvider>,
      elem
    );
  }
};

export const unmountReactApp = (elem: HTMLElement | null) => {
  if (elem) {
    unmountComponentAtNode(elem);
  }
};
