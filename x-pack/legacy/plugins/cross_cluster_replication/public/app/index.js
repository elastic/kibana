/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { I18nContext } from 'ui/i18n';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';

import { App } from './app';
import { ccrStore } from './store';

export const renderReact = async elem => {
  render(
    <I18nContext>
      <Provider store={ccrStore}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    </I18nContext>,
    elem
  );
};
