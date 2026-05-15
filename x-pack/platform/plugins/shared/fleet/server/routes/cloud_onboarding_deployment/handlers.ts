/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { cloudOnboardingDeploymentService } from '../../services/cloud_onboarding_deployment';
import type { FleetRequestHandler } from '../../types';
import { appContextService } from '../../services/app_context';
import type {
  CreateCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentsByConnectionIdRequestSchema,
  UpdateCloudOnboardingDeploymentRequestSchema,
  DeleteCloudOnboardingDeploymentRequestSchema,
} from '../../types/rest_spec/cloud_onboarding_deployment';

// TODO validate connectionId in fleet-cloud-connector
export const createCloudOnboardingDeploymentHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateCloudOnboardingDeploymentRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService
    .getLogger()
    .get('CloudOnboardingDeploymentService createCloudOnboardingDeploymentHandler');

  try {
    const deployment = await cloudOnboardingDeploymentService.create(
      internalSoClient,
      request.body
    );
    return response.ok({ body: { item: deployment } });
  } catch (error) {
    logger.error(`Failed to create cloud onboarding deployment`, error.message);
    return response.customError({
      statusCode: 400,
      body: { message: error.message },
    });
  }
};

export const getCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof GetCloudOnboardingDeploymentRequestSchema.params>
> = async (context, request, response) => {
  const logger = appContextService
    .getLogger()
    .get('CloudOnboardingDeploymentService getCloudOnboardingDeploymentHandler');

  try {
    const deployment = await cloudOnboardingDeploymentService.getById(request.params.id);
    return response.ok({ body: { item: deployment } });
  } catch (error) {
    logger.error(`Failed to get cloud onboarding deployment`, error.message);
    return response.customError({
      statusCode: 400,
      body: { message: error.message },
    });
  }
};

export const getCloudOnboardingDeploymentsByConnectionIdHandler: FleetRequestHandler<
  TypeOf<typeof GetCloudOnboardingDeploymentsByConnectionIdRequestSchema.params>
> = async (context, request, response) => {
  const logger = appContextService
    .getLogger()
    .get('CloudOnboardingDeploymentService getCloudOnboardingDeploymentsByConnectionIdHandler');

  try {
    const deployments = await cloudOnboardingDeploymentService.getByConnectionId(
      request.params.connectionId
    );
    return response.ok({ body: { items: deployments } });
  } catch (error) {
    logger.error(`Failed to get cloud onboarding deployments by connection id`, error.message);
    return response.customError({
      statusCode: 400,
      body: { message: error.message },
    });
  }
};

export const updateCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof UpdateCloudOnboardingDeploymentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateCloudOnboardingDeploymentRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService
    .getLogger()
    .get('CloudOnboardingDeploymentService updateCloudOnboardingDeploymentHandler');

  try {
    const deployment = await cloudOnboardingDeploymentService.update(
      internalSoClient,
      request.params.id,
      request.body
    );
    return response.ok({ body: { item: deployment } });
  } catch (error) {
    logger.error(`Failed to update cloud onboarding deployment`, error.message);
    return response.customError({
      statusCode: 400,
      body: { message: error.message },
    });
  }
};

export const deleteCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof DeleteCloudOnboardingDeploymentRequestSchema.params>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;
  const logger = appContextService
    .getLogger()
    .get('CloudOnboardingDeploymentService deleteCloudOnboardingDeploymentHandler');

  try {
    await cloudOnboardingDeploymentService.delete(internalSoClient, request.params.id);
    return response.ok({ body: { id: request.params.id } });
  } catch (error) {
    logger.error(`Failed to delete cloud onboarding deployment`, error.message);
    return response.customError({
      statusCode: 400,
      body: { message: error.message },
    });
  }
};
