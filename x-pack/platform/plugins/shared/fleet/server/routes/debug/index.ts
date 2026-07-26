/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { FLEET_DEBUG_ROUTES } from '../../constants';
import { API_VERSIONS } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import {
  FetchIndexRequestSchema,
  FetchSavedObjectNamesRequestSchema,
  FetchSavedObjectsRequestSchema,
} from '../../types/rest_spec/debug';

import {
  fetchIndexHandler,
  fetchSavedObjectNamesHandler,
  fetchSavedObjectsHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: FLEET_DEBUG_ROUTES.INDEX_PATTERN,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.FLEET.ALL],
        },
      },
      summary: 'Fetch a Fleet index',
      description:
        'Fetch the contents of a Fleet-managed Elasticsearch index by name. For internal debugging use only.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: FetchIndexRequestSchema },
      },
      fetchIndexHandler
    );

  router.versioned
    .post({
      path: FLEET_DEBUG_ROUTES.SAVED_OBJECTS_PATTERN,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.FLEET.ALL],
        },
      },
      summary: 'Fetch Fleet saved objects',
      description:
        'Fetch Fleet saved objects of a given type, optionally filtered by name. For internal debugging use only.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: FetchSavedObjectsRequestSchema },
      },
      fetchSavedObjectsHandler
    );

  router.versioned
    .post({
      path: FLEET_DEBUG_ROUTES.SAVED_OBJECT_NAMES_PATTERN,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.FLEET.ALL],
        },
      },
      summary: 'Fetch Fleet saved object names',
      description:
        'Fetch the names of all Fleet saved objects of a given type. For internal debugging use only.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: FetchSavedObjectNamesRequestSchema },
      },
      fetchSavedObjectNamesHandler
    );
};
