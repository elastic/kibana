/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import type { CloudOnboardingDeployment } from '../../../common/types';
import { CLOUD_CONNECTOR_SAVED_OBJECT_TYPE } from '../../../common/constants';

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
  // Omit null optional fields — the response schema uses schema.maybe() (undefined-or-value),
  // which does not accept null. Null is only used internally to clear a stored field.
  const { connectorId, authMethod, ...rest } = deployment;
  return {
    ...rest,
    ...(connectorId != null ? { connectorId } : {}),
    ...(authMethod != null ? { authMethod } : {}),
  };
}

const AGENT_BASED_AUTH_METHODS = new Set([
  'static_keys',
  'temporary_keys',
  'shared_credentials',
  'assume_role',
]);
const MANAGED_INTEGRATION_AUTH_METHODS = new Set(['identity_federation', 'static_keys']);

function validateAuthMethod(
  mechanisms: string[],
  authMethod: string | undefined
): string | undefined {
  if (!authMethod) return undefined;
  if (mechanisms.includes('agent_based') && !AGENT_BASED_AUTH_METHODS.has(authMethod)) {
    return `authMethod '${authMethod}' is not valid for agent_based deployments. Allowed: ${[
      ...AGENT_BASED_AUTH_METHODS,
    ].join(', ')}`;
  }
  if (
    (mechanisms.includes('managed_integration') || mechanisms.includes('ecf')) &&
    !MANAGED_INTEGRATION_AUTH_METHODS.has(authMethod)
  ) {
    return `authMethod '${authMethod}' is not valid for managed_integration/ecf deployments. Allowed: ${[
      ...MANAGED_INTEGRATION_AUTH_METHODS,
    ].join(', ')}`;
  }
  return undefined;
}

export const createCloudOnboardingDeploymentHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateCloudOnboardingDeploymentRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const { internalSoClient } = fleetContext;

  const authMethodError = validateAuthMethod(
    request.body.mechanisms ?? [],
    request.body.authMethod
  );
  if (authMethodError) {
    return response.badRequest({ body: { message: authMethodError } });
  }

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

  // Validate non-null connectorId is space-scoped, matching the create-time invariant.
  if (request.body.connectorId != null) {
    try {
      await internalSoClient.get(CLOUD_CONNECTOR_SAVED_OBJECT_TYPE, request.body.connectorId);
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
  }

  try {
    // Validate authMethod against the effective mechanisms after this PUT — either the
    // incoming mechanisms (if the request changes them) or the persisted ones. This prevents
    // a PUT { mechanisms: ['managed_integration'] } from leaving a stale assume_role method
    // that POST would have rejected, and vice-versa.
    if (request.body.authMethod !== undefined || request.body.mechanisms) {
      const existing = await cloudOnboardingDeploymentService.getById(
        internalSoClient,
        request.params.id
      );
      const effectiveMechanisms = request.body.mechanisms ?? existing.mechanisms;
      const effectiveAuthMethod = request.body.authMethod ?? existing.authMethod;
      if (effectiveAuthMethod) {
        const authMethodError = validateAuthMethod(effectiveMechanisms, effectiveAuthMethod);
        if (authMethodError) {
          return response.badRequest({ body: { message: authMethodError } });
        }
      }
    }

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
