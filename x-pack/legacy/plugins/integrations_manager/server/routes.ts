/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { PLUGIN_ID } from '../common/constants';
import { ServerRoute } from '../common/types';
import {
  API_LIST_PATTERN,
  API_INFO_PATTERN,
  API_INSTALL_PATTERN,
  API_DELETE_PATTERN,
} from '../common/routes';

import {
  handleGetInfo,
  handleGetList,
  handleRequestDelete,
  handleRequestInstall,
} from './integrations';

// Manager public API paths
export const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: API_LIST_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: handleGetList,
  },
  {
    method: 'GET',
    path: API_INFO_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: handleGetInfo,
  },
  {
    method: 'GET',
    path: API_INSTALL_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: handleRequestInstall,
  },
  {
    method: 'GET',
    path: API_DELETE_PATTERN,
    options: { tags: [`access:${PLUGIN_ID}`], json: { space: 2 } },
    handler: handleRequestDelete,
  },
];
