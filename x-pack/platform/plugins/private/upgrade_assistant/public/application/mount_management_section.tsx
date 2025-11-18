/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { RootComponent } from './app';
import type { AppDependencies } from '../types';

import { apiService } from './lib/api';
import { breadcrumbService } from './lib/breadcrumbs';

export function mountManagementSection(params: ManagementAppMountParams, deps: AppDependencies) {
  const { element, setBreadcrumbs } = params;

  const rootComponentDeps = {
    ...deps,
    services: {
      ...deps.services,
      api: apiService,
      breadcrumbs: breadcrumbService,
    },
  };

  apiService.setup(deps.services.core.http, deps.plugins.reindexService.reindexService);
  breadcrumbService.setup(setBreadcrumbs);

  render(<RootComponent {...rootComponentDeps} />, element);

  return () => {
    unmountComponentAtNode(element);
  };
}
