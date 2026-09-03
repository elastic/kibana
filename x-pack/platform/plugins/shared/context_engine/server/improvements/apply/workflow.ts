/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowProvider, WorkflowProviderContext } from '../../workflows/provider';
import { ApplyImprovementError } from './errors';

/**
 * Applies the automation half of an improvement.
 *
 * Every call runs with the approving user's request, so the workflow is created, updated, or
 * disabled under their own privileges — approving a suggestion never grants more than the user
 * already has. Removal disables and detaches rather than deletes, so it stays reversible.
 */

/** Rejects YAML the workflows engine would not accept, before anything is written. */
const assertValidYaml = async ({
  workflows,
  yaml,
  context,
}: {
  workflows: WorkflowProvider;
  yaml: string;
  context: WorkflowProviderContext;
}): Promise<void> => {
  const { valid, errors } = await workflows.validate({ ...context, yaml });
  if (valid) {
    return;
  }

  const summary = errors.slice(0, 3).join('; ');
  throw new ApplyImprovementError(
    `The suggested workflow definition is not valid${summary ? `: ${summary}` : '.'}`
  );
};

const getWorkflowOrThrow = async ({
  workflows,
  workflowId,
  context,
}: {
  workflows: WorkflowProvider;
  workflowId: string;
  context: WorkflowProviderContext;
}) => {
  const workflow = await workflows.get({ ...context, workflowId });
  if (!workflow) {
    throw new ApplyImprovementError(
      `Workflow [${workflowId}] was not found in this space. It may have been deleted since the suggestion was made.`
    );
  }
  return workflow;
};

/**
 * Creates the suggested workflow and links it to the AI index. The link is checked first and the
 * workflow is deleted again if linking still fails, so a rejected link leaves no orphan behind.
 */
export const addWorkflow = async ({
  workflows,
  aiIndexService,
  aiIndexId,
  yaml,
  context,
  logger,
}: {
  workflows: WorkflowProvider;
  aiIndexService: AiIndexService;
  aiIndexId: string;
  yaml: string;
  context: WorkflowProviderContext;
  logger: Logger;
}): Promise<string> => {
  await assertValidYaml({ workflows, yaml, context });
  await aiIndexService.assertCanAcceptAutomation(aiIndexId);

  const workflowId = await workflows.create({ ...context, yaml });

  try {
    await aiIndexService.addAutomation(aiIndexId, { type: 'workflow', value: workflowId });
    return workflowId;
  } catch (error) {
    try {
      await workflows.delete({ ...context, workflowId });
    } catch (deleteError) {
      logger.warn(
        `Failed to roll back workflow [${workflowId}] after it could not be linked to AI index [${aiIndexId}]`,
        { error: deleteError }
      );
    }
    throw error;
  }
};

/** Replaces an existing workflow's definition, leaving its enablement and schedule untouched. */
export const editWorkflow = async ({
  workflows,
  workflowId,
  yaml,
  context,
}: {
  workflows: WorkflowProvider;
  workflowId: string;
  yaml: string;
  context: WorkflowProviderContext;
}): Promise<string> => {
  const workflow = await getWorkflowOrThrow({ workflows, workflowId, context });
  if (workflow.managed) {
    throw new ApplyImprovementError(
      `Workflow [${workflowId}] is managed by Kibana and cannot be edited.`
    );
  }

  await assertValidYaml({ workflows, yaml, context });
  await workflows.update({ ...context, workflowId, yaml });

  return workflowId;
};

/**
 * Disables the workflow and detaches it from the AI index. The definition is kept, so re-enabling it
 * is all it takes to undo the removal.
 */
export const removeWorkflow = async ({
  workflows,
  aiIndexService,
  aiIndexId,
  workflowId,
  context,
}: {
  workflows: WorkflowProvider;
  aiIndexService: AiIndexService;
  aiIndexId: string;
  workflowId: string;
  context: WorkflowProviderContext;
}): Promise<string> => {
  const workflow = await getWorkflowOrThrow({ workflows, workflowId, context });

  if (workflow.enabled) {
    await workflows.setEnabled({ ...context, workflowId, enabled: false });
  }

  await aiIndexService.removeAutomation(aiIndexId, { type: 'workflow', value: workflowId });

  return workflowId;
};
