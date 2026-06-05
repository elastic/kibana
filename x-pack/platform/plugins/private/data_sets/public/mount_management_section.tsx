/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';

import { Main } from './main';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element }: ManagementAppMountParams
) => {
  ReactDOM.render(coreStart.rendering.addContext(<Main httpClient={coreStart.http} />), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
