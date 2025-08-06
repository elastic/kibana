/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS, CLOUD_CONNECTOR_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';

import { createCloudConnectorHandler, getCloudConnectorsHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // POST /api/fleet/cloud_connectors
  router.versioned
    .post({
      path: CLOUD_CONNECTOR_API_ROUTES.CREATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
                FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
              ],
            },
          ],
        },
      },
      summary: 'Create cloud connector',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            body: schema.object({
              name: schema.string({
                minLength: 1,
                maxLength: 255,
              }),
              cloudProvider: schema.oneOf([
                schema.literal('aws'),
                schema.literal('azure'),
                schema.literal('gcp'),
              ]),
              vars: schema.recordOf(
                schema.string({ minLength: 1, maxLength: 100 }),
                schema.oneOf([
                  schema.string({ maxLength: 1000 }),
                  schema.number(),
                  schema.boolean(),
                  schema.object({
                    type: schema.string({ maxLength: 50 }),
                    value: schema.oneOf([
                      schema.string({ maxLength: 1000 }),
                      schema.object({
                        isSecretRef: schema.boolean(),
                        id: schema.string({ maxLength: 255 }),
                      }),
                    ]),
                    frozen: schema.maybe(schema.boolean()),
                  }),
                ])
              ),
            }),
          },
          response: {
            200: {
              body: () =>
                schema.object({
                  id: schema.string(),
                  name: schema.string(),
                  cloudProvider: schema.string(),
                  vars: schema.recordOf(schema.string(), schema.any()),
                  packagePolicyCount: schema.number(),
                  created_at: schema.string(),
                  updated_at: schema.string(),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      createCloudConnectorHandler
    );

  // GET /api/fleet/cloud_connectors
  router.versioned
    .get({
      path: CLOUD_CONNECTOR_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
                FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
              ],
            },
          ],
        },
      },
      summary: 'Get cloud connectors',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: schema.object({
              page: schema.maybe(schema.string()),
              perPage: schema.maybe(schema.string()),
            }),
          },
          response: {
            200: {
              body: () =>
                schema.arrayOf(
                  schema.object({
                    id: schema.string(),
                    name: schema.string(),
                    cloudProvider: schema.string(),
                    vars: schema.recordOf(schema.string(), schema.any()),
                    packagePolicyCount: schema.number(),
                    created_at: schema.string(),
                    updated_at: schema.string(),
                  })
                ),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getCloudConnectorsHandler
    );
};
