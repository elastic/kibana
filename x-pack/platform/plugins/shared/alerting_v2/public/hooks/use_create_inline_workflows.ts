/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { WORKFLOW_VALIDATION_RULES } from '@kbn/workflows';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  buildInlineWorkflowYaml,
  getInlineActionStepDefinition,
  type InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';

const getInvalidWorkflowMessage = (draft: InlineWorkflowActionDraft, reasons: string[]): string => {
  const label = getInlineActionStepDefinition(draft.stepType)?.label ?? draft.stepType;
  return reasons.length > 0
    ? i18n.translate('xpack.alertingV2.actionPolicy.inlineWorkflows.invalidWorkflow', {
        defaultMessage: 'The {label} workflow is invalid: {reasons}',
        values: { label, reasons: reasons.join('; ') },
      })
    : i18n.translate('xpack.alertingV2.actionPolicy.inlineWorkflows.invalidWorkflowNoDetails', {
        defaultMessage: 'The {label} workflow is invalid.',
        values: { label },
      });
};

// Best effort: the reasons only make the error message more helpful.
const getValidationErrors = async (workflowApi: WorkflowApi, yaml: string): Promise<string[]> => {
  try {
    const { diagnostics } = await workflowApi.validateWorkflow({ yaml });
    // Variable checks are advisory: they never block saving a workflow.
    return diagnostics
      .filter(
        ({ severity, ruleId }) =>
          severity === 'error' && WORKFLOW_VALIDATION_RULES[ruleId]?.owner !== 'variable-validation'
      )
      .map(({ message }) => message);
  } catch {
    return [];
  }
};

/**
 * Creates single-step workflows for the provided inline action drafts and
 * returns their ids. Used by the action policy form to turn "simple workflow"
 * drafts into real workflows that can be referenced as destinations.
 *
 * `createInlineWorkflows` is self-cleaning: if creation of any draft fails, the
 * workflows created so far are rolled back before the error is re-thrown.
 * `rollbackWorkflows` is exposed separately for callers that need to undo the
 * created workflows when a later step (e.g. the action policy request) fails.
 */
export const useCreateInlineWorkflows = () => {
  const workflowApi = useService(WorkflowApi);

  const rollbackWorkflows = useCallback(
    async (ids: string[]): Promise<void> => {
      await Promise.allSettled(ids.map((id) => workflowApi.deleteWorkflow(id)));
    },
    [workflowApi]
  );

  const createInlineWorkflows = useCallback(
    async (drafts: InlineWorkflowActionDraft[]): Promise<string[]> => {
      const createdIds: string[] = [];
      try {
        for (const draft of drafts) {
          const yaml = buildInlineWorkflowYaml(draft);
          const created = await workflowApi.createWorkflow({ yaml });
          createdIds.push(created.id);

          // An invalid workflow is still saved, so it must be rejected here rather
          // than referenced as a destination that never runs.
          if (created.valid === false) {
            const reasons = await getValidationErrors(workflowApi, yaml);
            throw new Error(getInvalidWorkflowMessage(draft, reasons));
          }
        }
        return createdIds;
      } catch (err) {
        await rollbackWorkflows(createdIds);
        throw err;
      }
    },
    [workflowApi, rollbackWorkflows]
  );

  return { createInlineWorkflows, rollbackWorkflows };
};
