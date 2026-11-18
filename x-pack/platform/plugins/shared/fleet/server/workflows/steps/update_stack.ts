/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingUpdateStackCommonDefinition } from '../../../common/workflows/steps/update_stack';
import { appContextService } from '../../services/app_context';
import { awsOnboardingStackService } from '../../services/aws_onboarding';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingUpdateStackStepDefinition = createServerStepDefinition({
  ...awsOnboardingUpdateStackCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const { stack_id, integrations, template_sha, parameters } = context.input;
    try {
      const soClient = appContextService.getInternalUserSOClient(
        context.contextManager.getFakeRequest()
      );
      const { stackId, stackName, template, noChanges } = await awsOnboardingStackService.update({
        soClient,
        stackArn: stack_id,
        integrations,
        templateSha: template_sha,
        parameters,
      });
      return {
        output: {
          stack_id: stackId,
          stack_name: stackName,
          template_sha: template.templateSha,
          blueprint_id: template.blueprint?.id,
          blueprint_version: template.blueprint?.version,
          template_source: template.source,
          no_changes: noChanges,
        },
      };
    } catch (error) {
      return { error };
    }
  },
});
