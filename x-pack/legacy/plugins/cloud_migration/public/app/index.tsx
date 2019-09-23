/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { App } from './app';
import { getAppProviders } from './app_context';

import { Core, Plugins } from '../shim';

export const mountReactApp = (
  elem: HTMLElement | null,
  { core, plugins }: { core: Core; plugins: Plugins }
): void => {
  if (elem) {
    const AppProviders = getAppProviders({ core, plugins });
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
