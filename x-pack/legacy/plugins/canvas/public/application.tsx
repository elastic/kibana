/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store } from 'redux';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';
import { Provider } from 'react-redux';

import { AppMountParameters, CoreStart } from 'kibana/public';

// @ts-ignore Untyped local
import { App } from './components/app';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

export const renderApp = (
  coreStart: CoreStart,
  plugins: object,
  { element }: AppMountParameters,
  canvasStore: Store
) => {
  ReactDOM.render(
    <KibanaContextProvider services={{ ...coreStart, ...plugins }}>
      <I18nProvider>
        <Provider store={canvasStore}>
          <App />
        </Provider>
      </I18nProvider>
    </KibanaContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
