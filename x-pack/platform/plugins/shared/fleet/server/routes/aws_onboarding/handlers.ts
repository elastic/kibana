/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core/server';

import {
  BOOTSTRAP_TEMPLATE_FILENAME,
  BOOTSTRAP_TEMPLATE_YAML,
  awsOnboardingCredentialsService,
  awsOnboardingStackService,
  isAwsSdkError,
} from '../../services/aws_onboarding';
import { appContextService } from '../../services/app_context';
import { isAwsManagedOnboardingEnabled } from '../../services/utils/aws_onboarding';
import {
  FleetNotFoundError,
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
} from '../../errors';
import type { FleetRequestHandler } from '../../types';
import type {
  CreateAwsOnboardingStackRequestSchema,
  DeleteAwsOnboardingCredentialsRequestSchema,
  GetAwsOnboardingStackRequestSchema,
  PutAwsOnboardingCredentialsRequestSchema,
  UpdateAwsOnboardingStackRequestSchema,
} from '../../types/rest_spec/aws_onboarding';

const notEnabled = (response: KibanaResponseFactory) =>
  response.notFound({ body: { message: 'Managed AWS onboarding is not enabled' } });

const mapError = (error: unknown, response: KibanaResponseFactory) => {
  const logger = appContextService.getLogger().get('AwsOnboarding');
  if (error instanceof FleetNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (
    error instanceof IacProvisionerRequestError ||
    error instanceof IacProvisionerUnavailableError
  ) {
    return response.customError({ statusCode: 502, body: { message: error.message } });
  }
  if (isAwsSdkError(error)) {
    // AWS error messages name the denied action / failing resource; they carry no credentials.
    logger.warn(`CloudFormation call failed: ${error.name}: ${error.message}`);
    return response.customError({
      statusCode: 502,
      body: { message: `AWS ${error.name}: ${error.message}` },
    });
  }
  throw error;
};

export const getCredentialsHandler: FleetRequestHandler = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  const { createdAt, ...publicView } = await awsOnboardingCredentialsService.getPublic();
  return response.ok({ body: publicView });
};

export const putCredentialsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutAwsOnboardingCredentialsRequestSchema.body>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    // The secret in the body is written straight into the encrypted saved object and not echoed back.
    const saved = await awsOnboardingCredentialsService.save(request.body);
    return response.ok({ body: saved });
  } catch (error) {
    return mapError(error, response);
  }
};

export const deleteCredentialsHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof DeleteAwsOnboardingCredentialsRequestSchema.query>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    // The bootstrap stack goes first: once the credentials are gone Kibana cannot reach AWS, and
    // a failed deletion keeps the credentials so the user can retry or force-remove them.
    const bootstrapStack = request.query.force
      ? 'skipped'
      : await awsOnboardingStackService.deleteBootstrapStack();
    await awsOnboardingCredentialsService.delete();
    return response.ok({ body: { bootstrapStack } });
  } catch (error) {
    return mapError(error, response);
  }
};

export const createStackHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof CreateAwsOnboardingStackRequestSchema.body>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    const { internalSoClient } = await context.fleet;
    const result = await awsOnboardingStackService.create({
      soClient: internalSoClient,
      ...request.body,
    });
    return response.ok({ body: result });
  } catch (error) {
    return mapError(error, response);
  }
};

export const getStackHandler: FleetRequestHandler<
  TypeOf<typeof GetAwsOnboardingStackRequestSchema.params>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    const result = await awsOnboardingStackService.status(request.params.stackId);
    return response.ok({ body: result });
  } catch (error) {
    return mapError(error, response);
  }
};

export const updateStackHandler: FleetRequestHandler<
  TypeOf<typeof UpdateAwsOnboardingStackRequestSchema.params>,
  undefined,
  TypeOf<typeof UpdateAwsOnboardingStackRequestSchema.body>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    const { internalSoClient } = await context.fleet;
    const result = await awsOnboardingStackService.update({
      soClient: internalSoClient,
      cloudConnectorId: request.params.cloudConnectorId,
      ...request.body,
    });
    return response.ok({ body: result });
  } catch (error) {
    return mapError(error, response);
  }
};

export const getBootstrapTemplateHandler: FleetRequestHandler = async (
  context,
  request,
  response
) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  return response.ok({
    body: { filename: BOOTSTRAP_TEMPLATE_FILENAME, template: BOOTSTRAP_TEMPLATE_YAML },
  });
};
