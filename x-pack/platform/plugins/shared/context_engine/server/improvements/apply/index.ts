/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { ImprovementEnvelope } from '../../../common/http_api/improvements';
import type { AiIndexService } from '../../ai_indices/service';
import type { WorkflowProvider } from '../../workflows/provider';
import { ApplyImprovementError } from './errors';
import { addKi, editKi, removeKi } from './ki';
import { addWorkflow, editWorkflow, removeWorkflow } from './workflow';

export { ApplyImprovementError } from './errors';

export interface ApplyImprovementDeps {
  /** Request-scoped, so an approval is bounded by the approving user's own privileges. */
  esClient: ElasticsearchClient;
  aiIndexService: AiIndexService;
  /** Absent until `contextEngineAgentBuilder` registers it, which rules out the workflow actions. */
  workflows?: WorkflowProvider;
  spaceId: string;
  request: KibanaRequest;
  logger: Logger;
}

/** Reads a required field off the suggestion, failing with a message the reviewer can act on. */
const required = <T>(value: T | undefined, what: string, action: string): T => {
  if (value === undefined || value === null || value === '') {
    throw new ApplyImprovementError(
      `The ${action} suggestion is missing ${what}, so it cannot be applied.`
    );
  }
  return value;
};

const requireWorkflows = (workflows: WorkflowProvider | undefined): WorkflowProvider => {
  if (!workflows) {
    throw new ApplyImprovementError(
      'Workflows are not available in this deployment, so workflow suggestions cannot be applied.'
    );
  }
  return workflows;
};

/**
 * Carries out an approved suggestion and returns the id of what it created or changed.
 *
 * Throws {@link ApplyImprovementError} for anything the reviewer could plausibly fix — a malformed
 * payload, a target that has since disappeared, invalid workflow YAML. The caller records the
 * message on the improvement as `failed`, which stays actionable so it can be approved again.
 */
export const applyImprovement = async (
  improvement: ImprovementEnvelope,
  { esClient, aiIndexService, workflows, spaceId, request, logger }: ApplyImprovementDeps
): Promise<string> => {
  const { action, payload, target, ai_index_id: aiIndexId } = improvement;
  const now = new Date().toISOString();
  const getDest = async () => (await aiIndexService.get(aiIndexId)).dest;
  const context = { spaceId, request };

  switch (action) {
    case 'add_ki':
      return addKi({
        esClient,
        dest: await getDest(),
        ki: required(payload.ki, 'the Knowledge Indicator to add', action),
        now,
      });

    case 'edit_ki':
      return editKi({
        esClient,
        dest: await getDest(),
        kiId: required(target?.ki_id, 'the Knowledge Indicator it edits', action),
        ki: required(payload.ki, 'the replacement Knowledge Indicator fields', action),
      });

    case 'remove_ki':
      return removeKi({
        esClient,
        dest: await getDest(),
        kiId: required(target?.ki_id, 'the Knowledge Indicator it removes', action),
        now,
        reason: improvement.title,
      });

    case 'add_workflow':
      return addWorkflow({
        workflows: requireWorkflows(workflows),
        aiIndexService,
        aiIndexId,
        yaml: required(payload.workflow_yaml, 'the workflow definition to add', action),
        context,
        logger,
      });

    case 'edit_workflow':
      return editWorkflow({
        workflows: requireWorkflows(workflows),
        workflowId: required(target?.workflow_id, 'the workflow it edits', action),
        yaml: required(payload.workflow_yaml, 'the replacement workflow definition', action),
        context,
      });

    case 'remove_workflow':
      return removeWorkflow({
        workflows: requireWorkflows(workflows),
        aiIndexService,
        aiIndexId,
        workflowId: required(target?.workflow_id, 'the workflow it removes', action),
        context,
      });
  }
};
