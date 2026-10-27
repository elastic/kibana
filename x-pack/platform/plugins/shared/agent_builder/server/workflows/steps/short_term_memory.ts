/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { ShortTermMemorySystemClient } from '@kbn/agent-builder-server';
import {
  consolidateShortTermMemoriesStepCommonDefinition,
  decayShortTermMemoriesStepCommonDefinition,
  listShortTermMemoriesByOwnerStepCommonDefinition,
  listShortTermMemoriesStepCommonDefinition,
  setShortTermMemoryPromotionStepCommonDefinition,
  type ConsolidateShortTermMemoriesStepInput,
  type DecayShortTermMemoriesStepInput,
  type ListShortTermMemoriesByOwnerStepInput,
  type ListShortTermMemoriesStepInput,
  type SetShortTermMemoryPromotionStepInput,
} from '../../../common/workflows/steps/short_term_memory';
import { isAdminFromRequest } from '../../services/utils';

export interface ShortTermMemoryStepDeps {
  getSystemClient: () => ShortTermMemorySystemClient;
  isAdmin?: (esClient: ElasticsearchClient) => Promise<boolean>;
}

/** Cross-user memory access: only a workflow running as an administrator may use it. */
const assertAdmin = async (
  context: StepHandlerContext,
  isAdmin: (esClient: ElasticsearchClient) => Promise<boolean>
): Promise<void> => {
  if (!(await isAdmin(context.contextManager.getScopedEsClient()))) {
    throw new ExecutionError({
      type: 'PermissionError',
      message:
        "Reading or changing other users' short-term memories requires the workflow to run as an administrator.",
    });
  }
};

const defaultIsAdmin = (esClient: ElasticsearchClient) => isAdminFromRequest({ esClient });

export const listShortTermMemoriesStepDefinition = ({
  getSystemClient,
  isAdmin = defaultIsAdmin,
}: ShortTermMemoryStepDeps) =>
  createServerStepDefinition({
    ...listShortTermMemoriesStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        await assertAdmin(context, isAdmin);
        const input = context.input as ListShortTermMemoriesStepInput;
        const { spaceId } = context.contextManager.getContext().workflow;
        const memories = await getSystemClient().listForPromotion({
          spaceId,
          agentIds: input.agent_ids,
          statuses: input.statuses,
          since: input.since,
          limit: input.limit,
        });
        return { output: { memories } };
      } catch (error) {
        return { error };
      }
    },
  });

export const setShortTermMemoryPromotionStepDefinition = ({
  getSystemClient,
  isAdmin = defaultIsAdmin,
}: ShortTermMemoryStepDeps) =>
  createServerStepDefinition({
    ...setShortTermMemoryPromotionStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        await assertAdmin(context, isAdmin);
        const input = context.input as SetShortTermMemoryPromotionStepInput;
        const { spaceId } = context.contextManager.getContext().workflow;
        const result = await getSystemClient().setPromotion({
          spaceId,
          ids: input.ids,
          promotion: {
            status: input.status,
            ...(input.ai_index_id !== undefined && { ai_index_id: input.ai_index_id }),
            ...(input.ki_id !== undefined && { ki_id: input.ki_id }),
            ...(input.reason !== undefined && { reason: input.reason }),
          },
        });
        return { output: result };
      } catch (error) {
        return { error };
      }
    },
  });

export const listShortTermMemoriesByOwnerStepDefinition = ({
  getSystemClient,
  isAdmin = defaultIsAdmin,
}: ShortTermMemoryStepDeps) =>
  createServerStepDefinition({
    ...listShortTermMemoriesByOwnerStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        await assertAdmin(context, isAdmin);
        const input = context.input as ListShortTermMemoriesByOwnerStepInput;
        const { spaceId } = context.contextManager.getContext().workflow;
        const owners = await getSystemClient().listByOwner({
          spaceId,
          agentIds: input.agent_ids,
          changedWithinHours: input.changed_within_hours,
          maxOwners: input.max_owners,
          maxMemoriesPerOwner: input.max_memories,
        });
        return { output: { owners } };
      } catch (error) {
        return { error };
      }
    },
  });

export const consolidateShortTermMemoriesStepDefinition = ({
  getSystemClient,
  isAdmin = defaultIsAdmin,
}: ShortTermMemoryStepDeps) =>
  createServerStepDefinition({
    ...consolidateShortTermMemoriesStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        await assertAdmin(context, isAdmin);
        const input = context.input as ConsolidateShortTermMemoriesStepInput;
        const { workflow, execution } = context.contextManager.getContext();
        const result = await getSystemClient().consolidate({
          spaceId: workflow.spaceId,
          userId: input.user_id,
          agentId: input.agent_id,
          merges: input.merges ?? [],
          remove: input.remove ?? [],
          writer: {
            uri: `workflow://${workflow.id}`,
            metadata: { run_id: execution.id, space_id: workflow.spaceId },
          },
        });
        return { output: result };
      } catch (error) {
        return { error };
      }
    },
  });

export const decayShortTermMemoriesStepDefinition = ({
  getSystemClient,
  isAdmin = defaultIsAdmin,
}: ShortTermMemoryStepDeps) =>
  createServerStepDefinition({
    ...decayShortTermMemoriesStepCommonDefinition,
    handler: async (context: StepHandlerContext) => {
      try {
        await assertAdmin(context, isAdmin);
        const input = context.input as DecayShortTermMemoriesStepInput;
        const { spaceId } = context.contextManager.getContext().workflow;
        const result = await getSystemClient().decay({
          spaceId,
          agentIds: input.agent_ids,
          unusedDays: input.unused_days,
        });
        return { output: result };
      } catch (error) {
        return { error };
      }
    },
  });

export const shortTermMemoryStepRegistry = [
  listShortTermMemoriesStepDefinition,
  setShortTermMemoryPromotionStepDefinition,
  listShortTermMemoriesByOwnerStepDefinition,
  consolidateShortTermMemoriesStepDefinition,
  decayShortTermMemoriesStepDefinition,
];
