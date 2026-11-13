/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingCloudContextCommonDefinition } from '../../../common/workflows/steps/cloud_context';
import { appContextService } from '../../services/app_context';
import { getWorkloadIdentityStackParameters } from '../../services/aws_onboarding/cloud_context';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingCloudContextStepDefinition = createServerStepDefinition({
  ...awsOnboardingCloudContextCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const derived = getWorkloadIdentityStackParameters(appContextService.getCloud());
    const overrides = context.input.overrides ?? {};

    let source: 'cloud' | 'overrides' | 'none' = 'none';
    if (Object.keys(derived).length > 0) {
      source = 'cloud';
    } else if (Object.keys(overrides).length > 0) {
      source = 'overrides';
    }

    return { output: { parameters: { ...derived, ...overrides }, source } };
  },
});
