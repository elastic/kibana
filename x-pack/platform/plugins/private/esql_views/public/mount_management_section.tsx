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
import { EsqlViewsApp } from './app';
import type { StartDependencies } from './types';

export const mountManagementSection = (
  coreStart: CoreStart,
  pluginsStart: StartDependencies,
  { element }: ManagementAppMountParams
) => {
  ReactDOM.render(
    coreStart.rendering.addContext(
      <EsqlViewsApp
        notifications={coreStart.notifications}
        http={coreStart.http}
        data={pluginsStart.data}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
