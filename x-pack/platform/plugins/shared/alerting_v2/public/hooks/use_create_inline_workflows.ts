/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useService } from '@kbn/core-di-browser';
import { WorkflowApi } from '@kbn/workflows-ui';
import {
  buildInlineWorkflowYaml,
  type InlineWorkflowActionDraft,
} from '@kbn/alerting-v2-rule-form';

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
          const created = await workflowApi.createWorkflow({
            yaml: buildInlineWorkflowYaml(draft),
          });
          createdIds.push(created.id);
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
