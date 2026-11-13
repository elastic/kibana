/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingCreateConnectorCommonDefinition } from '../../../common/workflows/steps/create_connector';
import { appContextService } from '../../services/app_context';
import { cloudConnectorService } from '../../services/cloud_connector';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingCreateConnectorStepDefinition = createServerStepDefinition({
  ...awsOnboardingCreateConnectorCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const { name, role_arn, stack_id, template_sha, blueprint_id, blueprint_version } =
      context.input;
    try {
      const soClient = appContextService.getInternalUserSOClient(
        context.contextManager.getFakeRequest()
      );
      const connector = await cloudConnectorService.create(soClient, {
        name,
        cloudProvider: 'aws',
        vars: { role_arn: { type: 'text', value: role_arn } },
        iac_key: template_sha ?? null,
        iac_blueprint_id: blueprint_id,
        iac_blueprint_version: blueprint_version,
        iac_deployment_id: stack_id,
      });
      return { output: { cloud_connector_id: connector.id } };
    } catch (error) {
      return { error };
    }
  },
});
