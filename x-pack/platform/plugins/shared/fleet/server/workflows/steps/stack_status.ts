/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingStackStatusCommonDefinition } from '../../../common/workflows/steps/stack_status';
import { awsOnboardingStackService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingStackStatusStepDefinition = createServerStepDefinition({
  ...awsOnboardingStackStatusCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    try {
      const result = await awsOnboardingStackService.status(context.input.stack_id);
      return {
        output: {
          status: result.status,
          stack_status: result.stackStatus,
          reason: result.reason,
          role_arn: result.outputs?.roleArn,
          oidc_provider_arn: result.outputs?.oidcProviderArn,
        },
      };
    } catch (error) {
      return { error };
    }
  },
});
