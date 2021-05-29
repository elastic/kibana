/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';
import { SetupDeps, StartDeps } from './types';
import { ReportingExampleApp } from './components/app';

export const renderApp = (
  coreStart: CoreStart,
  deps: Omit<StartDeps & SetupDeps, 'developerExamples'>,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<ReportingExampleApp basename={appBasePath} {...coreStart} {...deps} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
