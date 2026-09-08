/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_ID_LENGTH, isEvalsOwnedWorkflow } from '@kbn/evals-plugin/common';
import { generateSavedWorkflowYaml } from '@kbn/evals-plugin/server';
import {
  assertDatasetsVisible,
  buildWorkflowLink,
  errorResult,
  evalExperimentConfigSchema,
  evalsTools,
  otherResult,
  toErrorResult,
  toGenerateParams,
} from './common';
import { hasManageEvalsPrivilege } from './check_privileges';
import type { EvalExperimentsToolDeps } from './deps';

const saveSchema = evalExperimentConfigSchema.extend({
  workflow_id: z
    .string()
    .max(MAX_ID_LENGTH)
    .optional()
    .describe(
      'Existing saved workflow id to update in place. Omit to create a new workflow (pass it to avoid duplicates when re-saving).'
    ),
});

/**
 * Saves an experiment configuration as a reusable, re-runnable workflow. Ids are
 * minted fresh on every run so scheduled re-runs form distinct, comparable experiments.
 */
export const saveEvalExperimentTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof saveSchema> => ({
  id: evalsTools.saveExperiment,
  type: ToolType.builtin,
  description:
    'Save an evaluation experiment as a reusable workflow. Pass workflow_id to update an existing saved workflow in place (idempotent re-save); omit it to create a new one. Returns the workflow id and a link.',
  schema: saveSchema,
  handler: async ({ workflow_id: workflowId, ...config }, { request, spaceId }) => {
    try {
      const { evals, security } = await deps.getStartDependencies();
      if (!(await hasManageEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the manage_evals privilege required to save evaluation experiment workflows in this space.'
        );
      }

      if (!evals.datasetService) {
        return toErrorResult(
          new Error('the evals dataset service is unavailable'),
          'Failed to save experiment workflow'
        );
      }

      await assertDatasetsVisible({
        datasetService: evals.datasetService,
        spaceId,
        datasetIds: config.dataset_ids,
      });

      const params = toGenerateParams(config);
      const workflow = generateSavedWorkflowYaml(params);

      if (workflowId) {
        const existing = await deps.workflowsApi.getWorkflow(workflowId, spaceId);
        if (!isEvalsOwnedWorkflow(existing)) {
          return errorResult(`Workflow not found: ${workflowId}`);
        }

        await deps.workflowsApi.updateWorkflow(
          workflowId,
          { yaml: workflow.yaml },
          spaceId,
          request
        );

        return otherResult({
          workflow_id: workflowId,
          name: workflow.name,
          updated: true,
          workflow_url: buildWorkflowLink(deps.serverBasePath, spaceId, workflowId),
        });
      }

      const created = await deps.workflowsApi.createWorkflow(
        { yaml: workflow.yaml },
        spaceId,
        request
      );

      return otherResult({
        workflow_id: created.id,
        name: created.name,
        updated: false,
        workflow_url: buildWorkflowLink(deps.serverBasePath, spaceId, created.id),
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to save experiment workflow');
    }
  },
});
