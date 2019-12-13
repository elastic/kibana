/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup, npStart } from 'ui/new_platform';
import { start as dataShimStart } from '../../../../../src/legacy/core_plugins/data/public/legacy';

export * from './types';

import { AppPlugin } from './app_plugin';

const app = new AppPlugin();
app.setup(npSetup.core, npSetup.plugins);
app.start(npStart.core, {
  ...npStart.plugins,
  dataShim: dataShimStart,
});
