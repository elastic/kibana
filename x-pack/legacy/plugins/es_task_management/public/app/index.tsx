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

export const mountReactApp = (elem: HTMLElement | null, { core }: { core: Core }): void => {
  if (elem) {
    const AppProviders = getAppProviders({ core });
    render(
      <AppProviders>
        <App />
      </AppProviders>,
      elem
    );
  }
};

export const unmountReactApp = (elem: HTMLElement | null) => {
  if (elem) {
    unmountComponentAtNode(elem);
  }
};
