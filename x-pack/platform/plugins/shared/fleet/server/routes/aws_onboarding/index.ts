/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS, AWS_ONBOARDING_API_ROUTES } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import {
  CreateAwsOnboardingStackRequestSchema,
  DeleteAwsOnboardingCredentialsRequestSchema,
  GetAwsOnboardingStackRequestSchema,
  PutAwsOnboardingCredentialsRequestSchema,
  UpdateAwsOnboardingStackRequestSchema,
} from '../../types/rest_spec/aws_onboarding';

import {
  createStackHandler,
  deleteCredentialsHandler,
  getBootstrapTemplateHandler,
  getCredentialsHandler,
  getStackHandler,
  putCredentialsHandler,
  updateStackHandler,
} from './handlers';

const READ_SECURITY = {
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
};

const WRITE_SECURITY = {
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

/** POC: Kibana-managed AWS onboarding (CloudFormation via the AWS SDK). Internal, gated by a feature flag. */
export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: AWS_ONBOARDING_API_ROUTES.BOOTSTRAP_TEMPLATE_PATTERN,
      summary: 'Get the managed onboarding bootstrap CloudFormation template',
      access: 'internal',
      security: READ_SECURITY,
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      getBootstrapTemplateHandler
    );

  router.versioned
    .get({
      path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
      summary: 'Get managed onboarding credential status',
      access: 'internal',
      security: READ_SECURITY,
    })
    .addVersion({ version: API_VERSIONS.internal.v1, validate: false }, getCredentialsHandler);

  router.versioned
    .put({
      path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
      summary: 'Store managed onboarding credentials',
      access: 'internal',
      security: WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: PutAwsOnboardingCredentialsRequestSchema },
      },
      putCredentialsHandler
    );

  router.versioned
    .delete({
      path: AWS_ONBOARDING_API_ROUTES.CREDENTIALS_PATTERN,
      summary: 'Delete managed onboarding credentials',
      access: 'internal',
      security: WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: DeleteAwsOnboardingCredentialsRequestSchema },
      },
      deleteCredentialsHandler
    );

  router.versioned
    .post({
      path: AWS_ONBOARDING_API_ROUTES.STACKS_PATTERN,
      summary: 'Create a Federated Identity CloudFormation stack',
      access: 'internal',
      security: WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: CreateAwsOnboardingStackRequestSchema },
      },
      createStackHandler
    );

  router.versioned
    .get({
      path: AWS_ONBOARDING_API_ROUTES.STACK_INFO_PATTERN,
      summary: 'Get a managed CloudFormation stack status',
      access: 'internal',
      security: READ_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: GetAwsOnboardingStackRequestSchema },
      },
      getStackHandler
    );

  router.versioned
    .post({
      path: AWS_ONBOARDING_API_ROUTES.STACK_UPDATE_PATTERN,
      summary: 'Update the CloudFormation stack of a cloud connector',
      access: 'internal',
      security: WRITE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: UpdateAwsOnboardingStackRequestSchema },
      },
      updateStackHandler
    );
};
