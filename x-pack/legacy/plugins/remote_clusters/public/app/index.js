/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';
import { Provider } from 'react-redux';

import { App } from './app';
import { remoteClustersStore } from './store';

export const renderReact = async (elem, I18nContext) => {
  render(
    <I18nContext>
      <Provider store={remoteClustersStore}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nContext>,
    elem
  );
};
