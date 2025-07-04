/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNINSTALL_TOKEN_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetConfigType } from '../../config';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import type { FleetAuthzRouter } from '../../services/security';
import {
  GetUninstallTokenRequestSchema,
  GetUninstallTokenResponseSchema,
  GetUninstallTokensMetadataRequestSchema,
  GetUninstallTokensMetadataResponseSchema,
} from '../../types/rest_spec/uninstall_token';

import { genericErrorResponse } from '../schema/errors';

import { getUninstallTokenHandler, getUninstallTokensMetadataHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  router.versioned
    .get({
      path: UNINSTALL_TOKEN_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: 'Get metadata for latest uninstall tokens',
      description: 'List the metadata for the latest uninstall tokens per agent policy.',
      options: {
        tags: ['oas-tag:Fleet uninstall tokens'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetUninstallTokensMetadataRequestSchema,
          response: {
            200: {
              body: () => GetUninstallTokensMetadataResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getUninstallTokensMetadataHandler
    );

  router.versioned
    .get({
      path: UNINSTALL_TOKEN_ROUTES.INFO_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: 'Get a decrypted uninstall token',
      description: 'Get one decrypted uninstall token by its ID.',
      options: {
        tags: ['oas-tag:Fleet uninstall tokens'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetUninstallTokenRequestSchema,
          response: {
            200: {
              body: () => GetUninstallTokenResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getUninstallTokenHandler
    );
};
