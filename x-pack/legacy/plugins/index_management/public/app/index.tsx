/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart } from '../../../../../../src/core/public';

import { App } from './app';
import { indexManagementStore } from './store';

export const mountReactApp = (elem: HTMLElement | null, { core }: { core: CoreStart }): void => {
  if (elem) {
    const { i18n } = core;
    const { Context: I18nContext } = i18n;

    render(
      <I18nContext>
        <Provider store={indexManagementStore()}>
          <App />
        </Provider>
      </I18nContext>,
      elem
    );
  }
};

export const unmountReactApp = (elem: HTMLElement | null) => {
  if (elem) {
    unmountComponentAtNode(elem);
  }
};
