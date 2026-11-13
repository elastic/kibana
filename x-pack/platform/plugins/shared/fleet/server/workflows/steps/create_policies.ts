/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError, yieldToEventLoop } from '@kbn/workflows/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';

import { awsOnboardingCreatePoliciesCommonDefinition } from '../../../common/workflows/steps/create_policies';
import { isAgenticAwsOnboardingEnabled } from '../../services/utils/agentic_aws_onboarding';

export const awsOnboardingCreatePoliciesStepDefinition = createServerStepDefinition({
  ...awsOnboardingCreatePoliciesCommonDefinition,
  handler: async (context) => {
    if (!(await isAgenticAwsOnboardingEnabled())) {
      return {
        error: new ExecutionError({
          type: 'PermissionError',
          message: 'Agentic AWS onboarding is not enabled',
        }),
      };
    }

    const { policies, cloud_connector_id: cloudConnectorId } = context.input;
    const unique = policies.filter(
      (policy, index) => policies.findIndex(({ service }) => service === policy.service) === index
    );

    const created: Array<{ service: string; policy_id: string }> = [];
    for (const policy of unique) {
      await yieldToEventLoop();
      if (context.abortSignal.aborted) {
        break;
      }
      try {
        const response = await context.contextManager.callKibanaApi<{ item: { id: string } }>({
          method: 'POST',
          path: '/api/fleet/managed_integrations',
          body: {
            ...policy.body,
            cloud_connector: {
              enabled: true,
              cloud_connector_id: cloudConnectorId,
              target_csp: 'aws',
            },
          },
        });
        created.push({ service: policy.service, policy_id: response.body.item.id });
      } catch (error) {
        return {
          error: new ExecutionError({
            type: 'NetworkError',
            message: `Failed to create the policy for ${policy.service}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            details: {
              service: policy.service,
              created: created.map(({ policy_id: policyId }) => policyId),
            },
          }),
        };
      }
    }

    return {
      output: {
        policies: created,
        policy_ids: created.map(({ policy_id: policyId }) => policyId),
      },
    };
  },
});
