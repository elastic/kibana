/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { ChromeBreadcrumb, CoreSetup } from '../../../../../src/core/public';
// @ts-ignore
import { rollupJobsStore } from './crud_app/store';
// @ts-ignore
import { App } from './crud_app/app';

/**
 * This module will be loaded asynchronously to reduce the bundle size of your plugin's main bundle.
 */
export const renderApp = async (
  core: CoreSetup,
  {
    element,
    setBreadcrumbs,
  }: { element: HTMLElement; setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void }
) => {
  const [coreStart] = await core.getStartServices();
  const I18nContext = coreStart.i18n.Context;

  render(
    <I18nContext>
      <KibanaContextProvider
        services={{
          setBreadcrumbs,
        }}
      >
        <Provider store={rollupJobsStore}>
          <App />
        </Provider>
      </KibanaContextProvider>
    </I18nContext>,
    element
  );
  return () => {
    unmountComponentAtNode(element);
  };
};
