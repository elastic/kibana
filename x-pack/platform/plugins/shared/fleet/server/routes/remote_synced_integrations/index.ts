/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';
import { REMOTE_SYNCED_INTEGRATIONS_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { genericErrorResponse } from '../schema/errors';
import { GetRemoteSyncedIntegrationsStatusResponseSchema } from '../../types/models/synced_integrations';

import { GetRemoteSyncedIntegrationsInfoRequestSchema } from '../../types';

import {
  getRemoteSyncedIntegrationsStatusHandler,
  getRemoteSyncedIntegrationsInfoHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter, isServerless?: boolean) => {
  if (isServerless) {
    return;
  }
  router.versioned
    .get({
      path: REMOTE_SYNCED_INTEGRATIONS_API_ROUTES.STATUS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.SETTINGS.READ,
            FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
          ],
        },
      },
      summary: `Get remote synced integrations status`,
      options: {
        tags: ['oas-tag:Fleet remote synced integrations'],
        availability: {
          since: '9.1.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {},
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetRemoteSyncedIntegrationsStatusResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getRemoteSyncedIntegrationsStatusHandler
    );

  router.versioned
    .get({
      path: REMOTE_SYNCED_INTEGRATIONS_API_ROUTES.INFO_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.SETTINGS.READ,
            FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
          ],
        },
      },
      summary: `Get remote synced integrations status by outputId`,
      options: {
        tags: ['oas-tag:Fleet remote synced integrations'],
        availability: {
          since: '9.1.0',
          stability: 'stable',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetRemoteSyncedIntegrationsInfoRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => GetRemoteSyncedIntegrationsStatusResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      getRemoteSyncedIntegrationsInfoHandler
    );
};
