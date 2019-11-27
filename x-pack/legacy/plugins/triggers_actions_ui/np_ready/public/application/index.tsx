/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from 'react-dom';
import { App } from './app';
import { AppDependencies } from '../../../public/shim';
import { getAppProviders } from './app_dependencies';

export const renderReact = async (elem: HTMLElement, appDependencies: AppDependencies) => {
  const Providers = getAppProviders(appDependencies);

  render(
    <Providers>
      <App />
    </Providers>,
    elem
  );
};
