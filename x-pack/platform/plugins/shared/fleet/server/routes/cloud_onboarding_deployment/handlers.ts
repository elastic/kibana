/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { CloudOnboardingDeployment } from '../../../common/types';

import { cloudOnboardingDeploymentService } from '../../services/cloud_onboarding_deployment';
import type { FleetRequestHandler } from '../../types';
import type {
  CreateCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentRequestSchema,
  GetCloudOnboardingDeploymentsByConnectorIdRequestSchema,
  UpdateCloudOnboardingDeploymentRequestSchema,
  DeleteCloudOnboardingDeploymentRequestSchema,
} from '../../types/rest_spec/cloud_onboarding_deployment';

function toResponseItem(deployment: CloudOnboardingDeployment) {
  return deployment;
}

export const createCloudOnboardingDeploymentHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateCloudOnboardingDeploymentRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  try {
    const deployment = await cloudOnboardingDeploymentService.create(
      internalSoClient,
      request.body
    );
    return response.ok({ body: { item: toResponseItem(deployment) } });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.badRequest({
        body: {
          message: `Cloud connector ${request.body.connectorId} not found in this space`,
        },
      });
    }
    throw error;
  }
};

export const getCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof GetCloudOnboardingDeploymentRequestSchema.params>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  try {
    const deployment = await cloudOnboardingDeploymentService.getById(
      internalSoClient,
      request.params.id
    );
    return response.ok({ body: { item: toResponseItem(deployment) } });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Cloud onboarding deployment ${request.params.id} not found` },
      });
    }
    throw error;
  }
};

export const getCloudOnboardingDeploymentsByConnectorIdHandler: FleetRequestHandler<
  TypeOf<typeof GetCloudOnboardingDeploymentsByConnectorIdRequestSchema.params>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  const deployments = await cloudOnboardingDeploymentService.getByConnectorId(
    internalSoClient,
    request.params.connectorId
  );
  return response.ok({ body: { items: deployments.map(toResponseItem) } });
};

export const updateCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof UpdateCloudOnboardingDeploymentRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateCloudOnboardingDeploymentRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  try {
    const deployment = await cloudOnboardingDeploymentService.update(
      internalSoClient,
      request.params.id,
      request.body
    );
    return response.ok({ body: { item: toResponseItem(deployment) } });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Cloud onboarding deployment ${request.params.id} not found` },
      });
    }
    throw error;
  }
};

export const deleteCloudOnboardingDeploymentHandler: FleetRequestHandler<
  TypeOf<typeof DeleteCloudOnboardingDeploymentRequestSchema.params>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  try {
    await cloudOnboardingDeploymentService.delete(internalSoClient, request.params.id);
    return response.ok({ body: { id: request.params.id } });
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return response.notFound({
        body: { message: `Cloud onboarding deployment ${request.params.id} not found` },
      });
    }
    throw error;
  }
};
