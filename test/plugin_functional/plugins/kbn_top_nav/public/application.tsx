/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { AppMountParameters } from '@kbn/core/public';
import { AppPluginDependencies } from './types';

export const renderApp = (
  depsStart: AppPluginDependencies,
  { appBasePath, element }: AppMountParameters
) => {
  const { TopNavMenu } = depsStart.navigation.ui;
  const config = [
    {
      id: 'new',
      label: 'New Button',
      description: 'New Demo',
      run() {},
      testId: 'demoNewButton',
    },
  ];
  render(
    <TopNavMenu appName="demo-app" config={config}>
      Hey
    </TopNavMenu>,
    element
  );

  return () => unmountComponentAtNode(element);
};
