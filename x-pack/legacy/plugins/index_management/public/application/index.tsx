/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '../../../../../../src/core/public';

import { AppContextProvider, AppDependencies } from './app_context';
import { App } from './app';
import { indexManagementStore } from './store';

export const renderApp = (
  elem: HTMLElement | null,
  { core, dependencies }: { core: CoreStart; dependencies: AppDependencies }
) => {
  if (!elem) {
    return () => undefined;
  }

  const { i18n } = core;
  const { Context: I18nContext } = i18n;
  const { services } = dependencies;

  render(
    <I18nContext>
      <Provider store={indexManagementStore(services)}>
        <AppContextProvider value={dependencies}>
          <App />
        </AppContextProvider>
      </Provider>
    </I18nContext>,
    elem
  );

  return () => {
    unmountComponentAtNode(elem);
  };
};

export { AppDependencies };
