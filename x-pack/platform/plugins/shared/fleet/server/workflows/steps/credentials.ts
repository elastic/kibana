/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingCredentialsCommonDefinition } from '../../../common/workflows/steps/credentials';
import {
  awsOnboardingCredentialsService,
  awsOnboardingDiscoveryService,
} from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingCredentialsStepDefinition = createServerStepDefinition({
  ...awsOnboardingCredentialsCommonDefinition,
  handler: async () => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const { configured, mode, region } = await awsOnboardingCredentialsService.getPublic();
    if (!configured) {
      return { output: { configured: false } };
    }

    try {
      const { accountId, discovery, provisioning } = await awsOnboardingDiscoveryService.verify();
      const failures = [
        discovery.ok ? undefined : `discovery: ${discovery.error ?? 'failed'}`,
        provisioning && !provisioning.ok
          ? `provisioning: ${provisioning.error ?? 'failed'}`
          : undefined,
      ].filter((failure): failure is string => failure !== undefined);
      return {
        output: {
          configured: true,
          mode,
          region,
          account_id: accountId,
          discovery_ok: discovery.ok,
          ...(provisioning ? { provisioning_ok: provisioning.ok } : {}),
          ...(failures.length > 0 ? { error: failures.join('; ') } : {}),
        },
      };
    } catch (error) {
      return {
        output: {
          configured: true,
          mode,
          region,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
});
