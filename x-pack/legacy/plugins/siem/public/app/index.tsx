/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { CoreStart, StartPlugins, AppMountParameters } from '../plugin';
import { SiemApp } from './app';

export const renderApp = (
  core: CoreStart,
  plugins: StartPlugins,
  { element }: AppMountParameters
) => {
  render(<SiemApp core={core} plugins={plugins} />, element);
  return () => unmountComponentAtNode(element);
};
