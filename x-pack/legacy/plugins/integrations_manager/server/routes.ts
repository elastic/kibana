/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN } from '../common/constants';
import { ServerRoute } from '../common/types';
import * as CommonRoutes from '../common/routes';
import * as Integrations from './integrations/handlers';

// Manager public API paths
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: CommonRoutes.API_CATEGORIES_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Integrations.handleGetCategories,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_LIST_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Integrations.handleGetList,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_INFO_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Integrations.handleGetInfo,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_INSTALL_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Integrations.handleRequestInstall,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_DELETE_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Integrations.handleRequestDelete,
  },
];
