/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, visitNestedSteps, type WorkflowYaml } from '@kbn/workflows';
import type { WorkflowAnonymizationProvider } from '@kbn/inference-plugin/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import {
  INFERENCE_PROCEED_CAPABILITY_ID,
  PII_TOKENIZATION_CAPABILITY_ID,
} from '@kbn/inference-plugin/server';
import {
  aroundCompletionEventSchema,
  CALL_SITE_PROCEED_STEP_ID,
  INFERENCE_AROUND_COMPLETION_TRIGGER_ID,
} from '../../common/workflow_anonymization';

type WorkflowAnonymizationManagement = Pick<
  WorkflowsManagementApi,
  'resolveWorkflowTriggerMatches' | 'executeWorkflowSynchronously'
>;

const countWorkflowStepType = (steps: WorkflowYaml['steps'], stepType: string): number => {
  let count = 0;
  visitNestedSteps(steps, ({ step }) => {
    if (step.type === stepType) {
      count += 1;
    }
  });
  return count;
};

export const createWorkflowAnonymizationProvider = ({
  management,
}: {
  management: WorkflowAnonymizationManagement;
}): WorkflowAnonymizationProvider => ({
  supportsSynchronousExecution: true,
  execute: async ({ event, namespace, request, pii, proceed, abortSignal }) => {
    const parsedEvent = aroundCompletionEventSchema.parse(event);
    // NOTE: getWorkflowsSubscribedToTrigger is unbounded (PIT + search_after), but for the
    // around-completion trigger the effective matched set is enforced by the >1 throw below.
    // Do not add a hard cap to the shared method — it also serves the event-driven execution path.
    const resolution = await management.resolveWorkflowTriggerMatches(
      INFERENCE_AROUND_COMPLETION_TRIGGER_ID,
      parsedEvent,
      namespace
    );

    if (resolution.invalidConditionWorkflowIds.length > 0) {
      // Fail closed across the space. Ignoring a malformed subscribed policy could allow an
      // unprotected connector call when the workflow author intended that policy to match.
      throw new Error(
        `Invalid around-completion trigger condition in workflow(s): ${resolution.invalidConditionWorkflowIds.join(
          ', '
        )}`
      );
    }
    if (resolution.matched.length === 0) {
      return { matched: false };
    }
    if (resolution.matched.length > 1) {
      throw new Error('Multiple workflows matched the around-completion inference event');
    }

    const [workflow] = resolution.matched;
    const proceedCount = countWorkflowStepType(
      workflow.definition?.steps ?? [],
      CALL_SITE_PROCEED_STEP_ID
    );
    if (proceedCount !== 1) {
      throw new Error(
        `Workflow "${workflow.id}" must contain exactly one ${CALL_SITE_PROCEED_STEP_ID} step`
      );
    }

    const response = await management.executeWorkflowSynchronously({
      workflowId: workflow.id,
      // Pass the already-fetched DTO to avoid a second ES read on the inference hot path.
      // executeWorkflowSynchronously validates the DTO (enabled/valid/definition) before executing.
      workflow,
      context: {
        event: parsedEvent,
        spaceId: namespace,
        triggeredBy: INFERENCE_AROUND_COMPLETION_TRIGGER_ID,
      },
      spaceId: namespace,
      request,
      capabilities: [
        { id: PII_TOKENIZATION_CAPABILITY_ID, value: pii },
        { id: INFERENCE_PROCEED_CAPABILITY_ID, value: proceed },
      ],
      abortSignal,
    });

    if (response.result?.status !== ExecutionStatus.COMPLETED) {
      throw new Error(`Workflow "${workflow.id}" did not complete successfully`);
    }
    const content = response.result.output?.content;
    if (typeof content !== 'string') {
      throw new Error(`Workflow "${workflow.id}" did not return string content`);
    }

    return { matched: true, content };
  },
});
