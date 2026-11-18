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
  readAwsOnboardingRunProgress,
  BOOTSTRAP_TEMPLATE_YAML,
  BOOTSTRAP_TEMPLATE_FILENAME,
} from '../../services/aws_onboarding';
import { findOnboardingExecution } from '../../services/aws_onboarding/execution';
import { appContextService } from '../../services/app_context';
import { isAwsManagedOnboardingEnabled } from '../../services/utils/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';
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
  DeleteAwsOnboardingCredentialsRequestSchema,
  GetAwsOnboardingBootstrapLaunchRequestSchema,
  GetAwsOnboardingBootstrapTemplateRequestSchema,
  GetAwsOnboardingRunRequestSchema,
  PutAwsOnboardingCredentialsRequestSchema,
} from '../../types/rest_spec/aws_onboarding';

const BOOTSTRAP_STACK_NAME = 'elastic-bootstrap-onboarding';

// The first code is the account-render endpoint's; the second is kept in case the render endpoint's code ever reaches this route.
const BOOTSTRAP_FALLBACK_ERROR_CODES = [
  'account_render.unknown_workflow',
  'render.unknown_workflow',
];

/** True when the provisioner cannot serve the blueprint at all (older deployment or unknown workflow), as opposed to failing on this request. */
const canFallBackToTemplate = (error: unknown): boolean =>
  error instanceof IacProvisionerRequestError &&
  (error.statusCode === 404 ||
    error.errorCodes.some((code) => BOOTSTRAP_FALLBACK_ERROR_CODES.includes(code)));

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

/** The progress of one agent-driven onboarding run, which the run card polls. */
export const getRunHandler: FleetRequestHandler<
  TypeOf<typeof GetAwsOnboardingRunRequestSchema.params>
> = async (context, request, response) => {
  if (!(await isAgenticAwsOnboardingEnabled())) {
    return response.notFound({ body: { message: 'Agent-driven AWS onboarding is not enabled' } });
  }
  const workflowsManagement = appContextService.getWorkflowsManagement();
  if (!workflowsManagement) {
    return response.customError({
      statusCode: 503,
      body: { message: 'Workflows are not available' },
    });
  }
  const { executionId } = request.params;
  try {
    const { spaceId } = await context.fleet;
    const execution = await findOnboardingExecution({
      workflowApi: workflowsManagement.management,
      executionId,
      spaceId,
      request,
      includeOutput: true,
    });
    // A run of another workflow answers like a missing one, so the route reveals nothing about it.
    if (!execution) {
      return response.notFound({
        body: { message: `AWS onboarding run '${executionId}' was not found` },
      });
    }
    return response.ok({ body: await readAwsOnboardingRunProgress(execution) });
  } catch (error) {
    return mapError(error, response);
  }
};

export const getBootstrapTemplateHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAwsOnboardingBootstrapTemplateRequestSchema.query>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  // The mode chosen in Kibana pre-fills the ManagementMode parameter, which stays editable in the console.
  const template = BOOTSTRAP_TEMPLATE_YAML.replace(
    'Default: fully-managed\n',
    `Default: ${request.query.mode}\n`
  );
  return response.ok({ body: { filename: BOOTSTRAP_TEMPLATE_FILENAME, template } });
};

export const getBootstrapLaunchHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetAwsOnboardingBootstrapLaunchRequestSchema.query>
> = async (context, request, response) => {
  if (!(await isAwsManagedOnboardingEnabled())) return notEnabled(response);
  if (!(await isIacProvisionerEnabled())) {
    return response.ok({ body: { kind: 'download' } });
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
      body: {
        kind: 'quick_create',
        quickCreateUrl,
        expiresAt: rendered.expiresAt,
        blueprint: rendered.blueprint,
      },
    });
  } catch (error) {
    // Message only: the artifact URL embeds signing credentials.
    logger.warn(
      `Bootstrap template render failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }`
    );
    if (canFallBackToTemplate(error)) return response.ok({ body: { kind: 'download' } });
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
