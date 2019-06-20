/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { RestoreSettings } from '../../../common/types';
import { serializeRestoreSettings } from '../../../common/lib';

export function registerRestoreRoutes(router: Router) {
  router.post('restore/{repository}/{snapshot}', createHandler);
}

export const createHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { repository, snapshot } = req.params;
  const restoreSettings = req.payload as RestoreSettings;

  return await callWithRequest('snapshot.restore', {
    repository,
    snapshot,
    body: serializeRestoreSettings(restoreSettings),
  });
};
