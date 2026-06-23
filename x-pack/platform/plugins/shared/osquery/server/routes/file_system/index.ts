/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { listDirectoryRoute } from './list_directory_route';
import { listRootsRoute } from './list_roots_route';
import { resolveCapabilityRoute } from './resolve_capability_route';
import { getFileHashesRoute } from './get_file_hashes_route';
import { auditRetrieveRoute } from './audit_retrieve_route';

/**
 * Registers the Files-tab (file-system viewer) internal routes. Gated behind the
 * `fileSystemViewer` experimental flag — when disabled the routes are not
 * registered at all, so they return 404.
 */
export const initFileSystemRoutes = (router: IRouter, context: OsqueryAppContext) => {
  if (!context.experimentalFeatures.fileSystemViewer) {
    return;
  }

  listDirectoryRoute(router, context);
  listRootsRoute(router, context);
  resolveCapabilityRoute(router, context);
  getFileHashesRoute(router, context);
  auditRetrieveRoute(router, context);
};
