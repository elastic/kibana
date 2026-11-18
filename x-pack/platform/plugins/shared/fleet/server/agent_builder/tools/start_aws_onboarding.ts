/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID } from '@kbn/workflows/managed';

import { checkOnboardingAccess } from './common';
import type { AwsOnboardingToolDeps } from './common';

// Any value other than `manual` keeps a `${{ }}` that the model puts in the inputs as a literal
// string instead of letting the engine evaluate it.
export const AWS_ONBOARDING_TOOL_TRIGGER_SOURCE = 'agent-builder-tool';

const startSchema = lazySchema(() =>
  z.object({
    region: z
      .string()
      .optional()
      .describe(
        'AWS region for the integration settings, for example us-east-1. Omit to use the region of the stored onboarding credentials.'
      ),
    namespace: z
      .string()
      .optional()
      .describe('Data stream namespace for the created policies. Omit to use the default.'),
    services: z
      .array(z.string().max(256))
      .max(100)
      .optional()
      .describe(
        'Catalog ids of services an earlier discovery in this conversation found matched and agentless. When set, the run skips discovery and selection. Omit to run discovery.'
      ),
  })
);

export const createStartAwsOnboardingTool = ({
  workflowApi,
}: AwsOnboardingToolDeps): BuiltinSkillBoundedTool<typeof startSchema> => ({
  id: 'start_aws_onboarding',
  type: ToolType.builtin,
  description:
    'Start the fully managed AWS agentless onboarding workflow for the current user and return its execution id. The run pauses for user input and approvals, so call get_aws_onboarding_state afterwards.',
  schema: startSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ region, namespace, services }, { request, spaceId }) => {
    const denied = await checkOnboardingAccess(request, 'write');
    if (denied) {
      return { results: [denied] };
    }

    const result = await executeWorkflow({
      workflowId: FLEET_AWS_AGENTLESS_ONBOARDING_WORKFLOW_ID,
      workflowParams: {
        ...(region ? { region } : {}),
        ...(namespace ? { namespace } : {}),
        ...(services?.length ? { services } : {}),
      },
      request,
      spaceId,
      workflowApi,
      waitForCompletion: false,
      triggeredBy: AWS_ONBOARDING_TOOL_TRIGGER_SOURCE,
    });

    if (!result.success) {
      return { results: [errorResult(`Failed to start AWS onboarding: ${result.error}`)] };
    }
    return {
      results: [
        otherResult({
          execution_id: result.execution.execution_id,
          workflow_id: result.execution.workflow_id,
        }),
      ],
    };
  },
});
