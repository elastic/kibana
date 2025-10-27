/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS, CLOUD_CONNECTOR_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';
import {
  CreateCloudConnectorRequestSchema,
  CreateCloudConnectorResponseSchema,
  GetCloudConnectorsRequestSchema,
  GetCloudConnectorsResponseSchema,
  GetCloudConnectorRequestSchema,
  GetCloudConnectorResponseSchema,
  UpdateCloudConnectorRequestSchema,
  UpdateCloudConnectorResponseSchema,
  DeleteCloudConnectorRequestSchema,
  DeleteCloudConnectorResponseSchema,
} from '../../types/rest_spec/cloud_connector';

import {
  createCloudConnectorHandler,
  getCloudConnectorsHandler,
  getCloudConnectorHandler,
  updateCloudConnectorHandler,
  deleteCloudConnectorHandler,
} from './handlers';

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
                FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
                FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
              ],
            },
          ],
        },
      },
      summary: 'Create cloud connector',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
        availability: {
          since: '9.2.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateCloudConnectorRequestSchema,
          response: {
            200: {
              body: () => CreateCloudConnectorResponseSchema,
              description: 'Indicates a successful call.',
            },
            400: {
              body: genericErrorResponse,
              description: 'Indicates a bad request call.',
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
        availability: {
          since: '9.2.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCloudConnectorsRequestSchema,
          response: {
            200: {
              body: () => GetCloudConnectorsResponseSchema,
              description: 'Indicates a successful call.',
            },
            400: {
              body: genericErrorResponse,
              description: 'Indicates a bad request call.',
            },
          },
        },
      },
      getCloudConnectorsHandler
    );

  // GET /api/fleet/cloud_connectors/{cloudConnectorId}
  router.versioned
    .get({
      path: CLOUD_CONNECTOR_API_ROUTES.INFO_PATTERN,
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
      summary: 'Get cloud connector',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
        availability: {
          since: '9.2.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCloudConnectorRequestSchema,
          response: {
            200: {
              body: () => GetCloudConnectorResponseSchema,
              description: 'Indicates a successful call.',
            },
            400: {
              body: genericErrorResponse,
              description: 'Indicates a bad request call.',
            },
          },
        },
      },
      getCloudConnectorHandler
    );

  // PUT /api/fleet/cloud_connectors/{cloudConnectorId}
  router.versioned
    .put({
      path: CLOUD_CONNECTOR_API_ROUTES.UPDATE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
                FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
              ],
            },
          ],
        },
      },
      summary: 'Update cloud connector',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
        availability: {
          since: '9.2.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdateCloudConnectorRequestSchema,
          response: {
            200: {
              body: () => UpdateCloudConnectorResponseSchema,
              description: 'Indicates a successful call.',
            },
            400: {
              body: genericErrorResponse,
              description: 'Indicates a bad request call.',
            },
          },
        },
      },
      updateCloudConnectorHandler
    );

  // DELETE /api/fleet/cloud_connectors/{cloudConnectorId}
  router.versioned
    .delete({
      path: CLOUD_CONNECTOR_API_ROUTES.DELETE_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
                FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
              ],
            },
          ],
        },
      },
      summary: 'Delete cloud connector (supports force deletion)',
      options: {
        tags: ['oas-tag:Fleet cloud connectors'],
        availability: {
          since: '9.2.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteCloudConnectorRequestSchema,
          response: {
            200: {
              body: () => DeleteCloudConnectorResponseSchema,
              description: 'Indicates a successful call.',
            },
            400: {
              body: genericErrorResponse,
              description: 'Indicates a bad request call.',
            },
          },
        },
      },
      deleteCloudConnectorHandler
    );
};
