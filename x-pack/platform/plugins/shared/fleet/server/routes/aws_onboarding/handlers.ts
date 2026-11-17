/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core/server';

import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
  awsOnboardingStackService,
  isAwsSdkError,
} from '../../services/aws_onboarding';
import { appContextService } from '../../services/app_context';
import { isAwsManagedOnboardingEnabled } from '../../services/utils/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';
import { submitSettingsAnswer } from '../../services/aws_onboarding/settings_answer';
import type { WorkflowApi } from '../../agent_builder/tools/common';
import type { AwsOnboardingSettingsAnswer } from '../../../common/workflows/steps/settings';
import { isIacProvisionerEnabled } from '../../services/utils/iac_provisioner';
import { iacProvisionerService } from '../../services/iac_provisioner';
import {
  getQuickCreateUrl,
  setQuickCreateStackName,
  setQuickCreateStackParams,
  withConsoleRegion,
} from '../../../common/services';
import { IAC_MANAGED_ONBOARDING_BOOTSTRAP_WORKFLOW } from '../../../common/types/rest_spec/iac_provisioner';
import { AWS_CLOUD_PROVIDER } from '../../../common/types/models/cloud_connector';
import {
  FleetNotFoundError,
  IacProvisionerRequestError,
  IacProvisionerUnavailableError,
} from '../../errors';
import type { FleetRequestHandler } from '../../types';
import type {
  CreateAwsOnboardingStackRequestSchema,
  DeleteAwsOnboardingCredentialsRequestSchema,
  GetAwsOnboardingBootstrapLaunchRequestSchema,
  GetAwsOnboardingStackRequestSchema,
  PutAwsOnboardingCredentialsRequestSchema,
  SubmitAwsOnboardingSettingsRequestSchema,
  UpdateAwsOnboardingStackRequestSchema,
} from '../../types/rest_spec/aws_onboarding';

/** Validates the settings answer against the run's requirement and resumes it when valid. */
export const createSubmitSettingsHandler =
  (
    workflowApi: WorkflowApi
  ): FleetRequestHandler<
    TypeOf<typeof SubmitAwsOnboardingSettingsRequestSchema.params>,
    undefined,
    AwsOnboardingSettingsAnswer
  > =>
  async (context, request, response) => {
    if (!(await isAgenticAwsOnboardingEnabled())) return notEnabled(response);
    try {
      const { spaceId } = await context.fleet;
      const result = await submitSettingsAnswer({
        workflowApi,
        executionId: request.params.executionId,
        spaceId,
        request,
        answer: request.body,
      });
      return response.ok({ body: result });
    } catch (error) {
      return response.conflict({
        body: { message: error instanceof Error ? error.message : 'Could not submit settings' },
      });
    }
  };

const BOOTSTRAP_STACK_NAME = 'elastic-bootstrap-onboarding';

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

export const getBootstrapLaunchHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAwsOnboardingBootstrapLaunchRequestSchema.query>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  if (!(await isIacProvisionerEnabled())) {
    return response.customError({
      statusCode: 503,
      body: { message: 'The IaC Provisioner is not available' },
    });
  }
  const logger = appContextService.getLogger().get('AwsOnboarding');
  try {
    const rendered = await iacProvisionerService.renderAccountTemplate({
      provider: AWS_CLOUD_PROVIDER,
      workflow: IAC_MANAGED_ONBOARDING_BOOTSTRAP_WORKFLOW,
    });
    if (!rendered.render || !rendered.artifactUrl || !rendered.expiresAt) {
      return response.customError({
        statusCode: 502,
        body: { message: 'The IaC Provisioner did not render the bootstrap template' },
      });
    }
    // The mode chosen in Kibana pre-fills the console form's ManagementMode parameter; it stays
    // editable there, like any approval screen.
    const { mode, region } = request.query;
    const stackUrl = setQuickCreateStackParams(
      setQuickCreateStackName(getQuickCreateUrl(rendered.artifactUrl), BOOTSTRAP_STACK_NAME),
      { ManagementMode: mode }
    );
    // The region keeps the console, and so the stack, in the region the credentials will use.
    const quickCreateUrl = region ? withConsoleRegion(stackUrl, region) : stackUrl;
    return response.ok({
      body: { quickCreateUrl, expiresAt: rendered.expiresAt, blueprint: rendered.blueprint },
    });
  } catch (error) {
    // Message only: the artifact URL embeds signing credentials.
    logger.warn(
      `Bootstrap template render failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    return mapError(error, response);
  }
};

export const getDiscoveryHandler: FleetRequestHandler = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    return response.ok({ body: await awsOnboardingDiscoveryService.discover() });
  } catch (error) {
    return mapError(error, response);
  }
};

export const getVerifyHandler: FleetRequestHandler = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  try {
    return response.ok({ body: await awsOnboardingDiscoveryService.verify() });
  } catch (error) {
    return mapError(error, response);
  }
};
