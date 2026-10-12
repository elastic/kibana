/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS, CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse, notFoundResponse } from '../schema/errors';
import {
  CreateCloudOnboardingDeploymentRequestSchema,
  CreateCloudOnboardingDeploymentResponseSchema,
  GetCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentResponseSchema,
  GetCloudOnboardingDeploymentsByConnectorIdRequestSchema,
  GetCloudOnboardingDeploymentsByConnectorIdResponseSchema,
  UpdateCloudOnboardingDeploymentRequestSchema,
  UpdateCloudOnboardingDeploymentResponseSchema,
  DeleteCloudOnboardingDeploymentRequestSchema,
  DeleteCloudOnboardingDeploymentResponseSchema,
  StartAwsStackCallbackRequestSchema,
  StartAwsStackCallbackResponseSchema,
  GetAwsStackCallbackRequestSchema,
  GetAwsStackCallbackResponseSchema,
} from '../../types/rest_spec/cloud_onboarding_deployment';

import {
  createCloudOnboardingDeploymentHandler,
  getCloudOnboardingDeploymentHandler,
  getCloudOnboardingDeploymentsByConnectorIdHandler,
  updateCloudOnboardingDeploymentHandler,
  deleteCloudOnboardingDeploymentHandler,
  startAwsStackCallbackHandler,
  getAwsStackCallbackHandler,
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
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/post_cloud_onboarding_deployment.yaml'),
        },
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

  // GET /api/fleet/cloud_onboarding_deployments/{id}
  router.versioned
    .get({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.INFO_PATTERN,
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
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/get_cloud_onboarding_deployment.yaml'),
        },
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
            404: {
              body: notFoundResponse,
              description: 'Not found.',
            },
          },
        },
      },
      getCloudOnboardingDeploymentHandler
    );

  // GET /api/fleet/cloud_onboarding_deployments/connector/{connectorId}
  router.versioned
    .get({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.BY_CONNECTOR_PATTERN,
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
      summary: 'Get cloud onboarding deployments by connector ID',
      description: 'List all cloud onboarding deployments for a given connector ID.',
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
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/get_cloud_onboarding_deployments_by_connector_id.yaml'),
        },
        validate: {
          request: GetCloudOnboardingDeploymentsByConnectorIdRequestSchema,
          response: {
            200: {
              body: () => GetCloudOnboardingDeploymentsByConnectorIdResponseSchema,
              description: 'OK: A successful request.',
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getCloudOnboardingDeploymentsByConnectorIdHandler
    );

  // PUT /api/fleet/cloud_onboarding_deployments/{id}
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
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/put_cloud_onboarding_deployment.yaml'),
        },
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
            404: {
              body: notFoundResponse,
              description: 'Not found.',
            },
          },
        },
      },
      updateCloudOnboardingDeploymentHandler
    );

  // DELETE /api/fleet/cloud_onboarding_deployments/{id}
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
        options: {
          oasOperationObject: () =>
            path.join(__dirname, 'examples/delete_cloud_onboarding_deployment.yaml'),
        },
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
            404: {
              body: notFoundResponse,
              description: 'Not found.',
            },
          },
        },
      },
      deleteCloudOnboardingDeploymentHandler
    );

  // Both callback routes can end in a new cloud connector, so they need the privileges to create one.
  const awsStackCallbackPrivileges = {
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
  };

  // POST /internal/fleet/cloud_onboarding_deployments/{id}/aws_stack_callback
  router.versioned
    .post({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.AWS_STACK_CALLBACK_PATTERN,
      access: 'internal',
      security: awsStackCallbackPrivileges,
      summary: 'Start an AWS stack callback',
      description:
        'Returns the stack parameters that make a launched CloudFormation stack report its role back, so Kibana creates the cloud connector.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: StartAwsStackCallbackRequestSchema,
          response: {
            200: {
              body: () => StartAwsStackCallbackResponseSchema,
              description: 'OK: A successful request.',
            },
            404: {
              body: genericErrorResponse,
              description: 'Not found, or callbacks are not enabled.',
            },
            409: {
              body: genericErrorResponse,
              description: 'A cloud connector is being created from an earlier stack.',
            },
            502: {
              body: genericErrorResponse,
              description: 'The IaC Provisioner failed.',
            },
          },
        },
      },
      startAwsStackCallbackHandler
    );

  // GET /internal/fleet/cloud_onboarding_deployments/{id}/aws_stack_callback
  router.versioned
    .get({
      path: CLOUD_ONBOARDING_DEPLOYMENT_API_ROUTES.AWS_STACK_CALLBACK_PATTERN,
      access: 'internal',
      security: awsStackCallbackPrivileges,
      summary: 'Get an AWS stack callback',
      description:
        'Returns the state of the stack callback, creating the cloud connector first if the stack has reported.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: GetAwsStackCallbackRequestSchema,
          response: {
            200: {
              body: () => GetAwsStackCallbackResponseSchema,
              description: 'OK: A successful request.',
            },
            404: {
              body: genericErrorResponse,
              description: 'Not found, or callbacks are not enabled.',
            },
            502: {
              body: genericErrorResponse,
              description: 'The IaC Provisioner failed.',
            },
          },
        },
      },
      getAwsStackCallbackHandler
    );
};
