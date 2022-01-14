/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY,
  DATA_VIEW_PATH,
  SERVICE_KEY,
  SERVICE_PATH,
  SERVICE_PATH_LEGACY,
} from '../../../../src/plugins/data_views/server';

const legacyConfig = {
  name: 'legacy index pattern api',
  path: DATA_VIEW_PATH_LEGACY,
  basePath: SERVICE_PATH_LEGACY,
  serviceKey: SERVICE_KEY_LEGACY,
};

const dataViewConfig = {
  name: 'data view api',
  path: DATA_VIEW_PATH,
  basePath: SERVICE_PATH,
  serviceKey: SERVICE_KEY,
};

export const configArray = [legacyConfig, dataViewConfig];
