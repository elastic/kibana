/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router } from '../../../../../server/lib/create_router';
import { Plugins } from '../../shim';
import { registerAppRoutes } from './app';
import { registerRepositoriesRoutes } from './repositories';
import { registerSnapshotsRoutes } from './snapshots';
import { registerRestoreRoutes } from './restore';
import { registerPolicyRoutes } from './policy';

export const registerRoutes = (router: Router, plugins: Plugins): void => {
  const isSlmEnabled = plugins.settings.config.isSlmEnabled;

  registerAppRoutes(router, plugins);
  registerRepositoriesRoutes(router, plugins);
  registerSnapshotsRoutes(router, plugins);
  registerRestoreRoutes(router);

  if (isSlmEnabled) {
    registerPolicyRoutes(router, plugins);
  }
};
