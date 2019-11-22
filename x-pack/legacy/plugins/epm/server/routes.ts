/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN } from '../common/constants';
import { ServerRoute } from '../server/types';
import * as CommonRoutes from '../common/routes';
import * as Packages from './packages/handlers';

// Manager public API paths
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: CommonRoutes.API_CATEGORIES_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Packages.handleGetCategories,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_LIST_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Packages.handleGetList,
  },
  {
    method: 'GET',
    path: `${CommonRoutes.API_INFO_PATTERN}/{filePath*}`,
    options: { tags: [`access:${PLUGIN.ID}`] },
    handler: Packages.handleGetFile,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_INFO_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Packages.handleGetInfo,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_INSTALL_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Packages.handleRequestInstall,
  },
  {
    method: 'GET',
    path: CommonRoutes.API_DELETE_PATTERN,
    options: { tags: [`access:${PLUGIN.ID}`], json: { space: 2 } },
    handler: Packages.handleRequestDelete,
  },
];
