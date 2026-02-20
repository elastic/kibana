/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';

import { createPackRoute } from './create_pack_route';
import { copyPackRoute } from './copy_pack_route';
import { deletePackRoute } from './delete_pack_route';
import { findPackRoute } from './find_pack_route';
import { readPackRoute } from './read_pack_route';
import { updatePackRoute } from './update_pack_route';

export const initPackRoutes = (router: IRouter, context: OsqueryAppContext) => {
  createPackRoute(router, context);
  if (context.experimentalFeatures.queryHistoryRework) {
    copyPackRoute(router, context);
  }

  deletePackRoute(router, context);
  findPackRoute(router, context);
  readPackRoute(router, context);
  updatePackRoute(router, context);
};
