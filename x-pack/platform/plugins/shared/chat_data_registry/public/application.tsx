/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters } from '@kbn/core/public';
import { ChatDataRegistryApp } from './components/app';

export const renderApp = (mountParameters: AppMountParameters) => {
  ReactDOM.render(<ChatDataRegistryApp />, mountParameters.element);

  return () => ReactDOM.unmountComponentAtNode(mountParameters.element);
};
