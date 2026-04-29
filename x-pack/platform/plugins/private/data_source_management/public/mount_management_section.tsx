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

import { DataSourceManagementApp } from './data_source_management_app';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, history, setBreadcrumbs }: ManagementAppMountParams
) => {
  ReactDOM.render(
    coreStart.rendering.addContext(
      <DataSourceManagementApp
        coreStart={coreStart}
        history={history}
        setBreadcrumbs={setBreadcrumbs}
      />
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
