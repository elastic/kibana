/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';
import {
  CreateCloudOnboardingDeploymentRequestSchema,
  CreateCloudOnboardingDeploymentResponseSchema,
  GetCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentResponseSchema,
  GetCloudOnboardingDeploymentsByConnectionIdRequestSchema,
  GetCloudOnboardingDeploymentsByConnectionIdResponseSchema,
  UpdateCloudOnboardingDeploymentRequestSchema,
  UpdateCloudOnboardingDeploymentResponseSchema,
  DeleteCloudOnboardingDeploymentRequestSchema,
  DeleteCloudOnboardingDeploymentResponseSchema,
} from '../../types/rest_spec/cloud_onboarding_deployment';

import {
  createCloudOnboardingDeploymentHandler,
  getCloudOnboardingDeploymentHandler,
  getCloudOnboardingDeploymentsByConnectionIdHandler,
  updateCloudOnboardingDeploymentHandler,
  deleteCloudOnboardingDeploymentHandler,
} from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // POST /api/fleet/cloud_onboarding_deployments
  router.versioned
    .post({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.CREATE_PATTERN,
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
      summary: 'Create cloud onboarding deployment',
      description: 'Create a new Fleet cloud onboarding deployment.',
      options: {
        tags: ['oas-tag:Fleet cloud onboarding deployments'],
        availability: {
          since: '9.5.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CreateCloudOnboardingDeploymentRequestSchema,
          response: {
            200: {
              body: () => CreateCloudOnboardingDeploymentResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      createCloudOnboardingDeploymentHandler
    );

  // GET /api/fleet/cloud_onboarding_deployments/{deploymentId}
  router.versioned
    .get({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.INFO_PATTERN,
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
      summary: 'Get cloud onboarding deployment',
      description: 'Get a cloud onboarding deployment by ID.',
      options: {
        tags: ['oas-tag:Fleet cloud onboarding deployments'],
        availability: {
          since: '9.5.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCloudOnboardingDeploymentRequestSchema,
          response: {
            200: {
              body: () => GetCloudOnboardingDeploymentResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getCloudOnboardingDeploymentHandler
    );

  // GET /api/fleet/cloud_onboarding_deployments/connection/{connectionId}
  router.versioned
    .get({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.BY_CONNECTION_PATTERN,
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
      summary: 'Get cloud onboarding deployments by connection ID',
      description: 'List all cloud onboarding deployments for a given connection ID.',
      options: {
        tags: ['oas-tag:Fleet cloud onboarding deployments'],
        availability: {
          since: '9.5.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetCloudOnboardingDeploymentsByConnectionIdRequestSchema,
          response: {
            200: {
              body: () => GetCloudOnboardingDeploymentsByConnectionIdResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getCloudOnboardingDeploymentsByConnectionIdHandler
    );

  // PUT /api/fleet/cloud_onboarding_deployments/{deploymentId}
  router.versioned
    .put({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.UPDATE_PATTERN,
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
      summary: 'Update cloud onboarding deployment',
      description: 'Update a cloud onboarding deployment by ID.',
      options: {
        tags: ['oas-tag:Fleet cloud onboarding deployments'],
        availability: {
          since: '9.5.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: UpdateCloudOnboardingDeploymentRequestSchema,
          response: {
            200: {
              body: () => UpdateCloudOnboardingDeploymentResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      updateCloudOnboardingDeploymentHandler
    );

  // DELETE /api/fleet/cloud_onboarding_deployments/{deploymentId}
  router.versioned
    .delete({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.DELETE_PATTERN,
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
      summary: 'Delete cloud onboarding deployment',
      description: 'Delete a cloud onboarding deployment by ID.',
      options: {
        tags: ['oas-tag:Fleet cloud onboarding deployments'],
        availability: {
          since: '9.5.0',
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteCloudOnboardingDeploymentRequestSchema,
          response: {
            200: {
              body: () => DeleteCloudOnboardingDeploymentResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      deleteCloudOnboardingDeploymentHandler
    );
};
