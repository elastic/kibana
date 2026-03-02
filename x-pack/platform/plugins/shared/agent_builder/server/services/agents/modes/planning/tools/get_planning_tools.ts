/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  ToolType,
  ChatEventType,
  type AgentMode,
  type Plan,
  type ActionItemStatus,
  type ChatAgentEvent,
} from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  ExecutableTool,
  ScopedRunner,
  ToolProvider,
  AgentEventEmitterFn,
} from '@kbn/agent-builder-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server/tools';
import { builtinToolToExecutable } from '../../utils';

const MAX_PLAN_ITEMS = 50;

const actionItemStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

const actionItemSchema = z.object({
  description: z.string().describe('Description of the action item'),
  status: actionItemStatusSchema
    .optional()
    .default('pending')
    .describe('Status of the item. Defaults to pending.'),
  related_skills: z
    .array(z.string())
    .optional()
    .describe('Skill IDs this step relies on (e.g. alert_triage)'),
  related_tools: z
    .array(z.string())
    .optional()
    .describe('Tool IDs this step relies on (e.g. platform.search)'),
});

const createPlanSchema = z.object({
  title: z.string().describe('Short title summarizing the plan'),
  description: z.string().optional().describe('Optional longer description of the approach'),
  action_items: z
    .array(actionItemSchema)
    .min(1)
    .max(MAX_PLAN_ITEMS)
    .describe('Ordered list of action items (1–50)'),
});

const updatePlanSchema = z.object({
  title: z.string().optional().describe('Updated plan title'),
  description: z.string().optional().describe('Updated plan description'),
  action_items: z
    .array(
      z.object({
        index: z.number().describe('Zero-based index of the action item to update'),
        description: z.string().optional().describe('New description'),
        status: actionItemStatusSchema.optional().describe('New status'),
        related_skills: z.array(z.string()).optional().describe('Updated skill references'),
        related_tools: z.array(z.string()).optional().describe('Updated tool references'),
      })
    )
    .optional()
    .describe('Action items to update by index'),
  new_items: z
    .array(actionItemSchema)
    .optional()
    .describe('New action items to append to the plan'),
  status: z.enum(['draft', 'ready']).optional().describe('Updated plan status (draft or ready)'),
});

const suggestPlanningModeSchema = z.object({
  reason: z.string().describe('Why the agent suggests switching to planning mode'),
});

const listAvailableToolsSchema = z.object({
  filter: z
    .string()
    .optional()
    .describe('Optional keyword to filter tools by name or description (case-insensitive)'),
});

export interface PlanState {
  current: Plan | undefined;
}

export interface GetPlanningToolsOptions {
  eventEmitter: AgentEventEmitterFn;
  planState: PlanState;
  agentMode: AgentMode;
  toolProvider: ToolProvider;
  runner: ScopedRunner;
  request: KibanaRequest;
}

/**
 * Factory that creates the planning tools with closed-over dependencies.
 * Returns ExecutableTools ready to be added to the tool set.
 */
export const getPlanningTools = ({
  eventEmitter,
  planState,
  agentMode,
  toolProvider,
  runner,
  request,
}: GetPlanningToolsOptions): ExecutableTool[] => {
  const createPlanTool: BuiltinToolDefinition<typeof createPlanSchema> = {
    id: 'planning.create_plan',
    type: ToolType.builtin,
    description:
      'Create a structured plan with ordered action items, replacing any existing plan. In planning mode the plan starts as a draft requiring user approval. In agent mode the plan is immediately ready for execution.',
    tags: ['planning'],
    schema: createPlanSchema,
    handler: async ({ title, description, action_items: actionItems }) => {
      const plan: Plan = {
        title,
        description,
        action_items: actionItems.map((item) => ({
          description: item.description,
          status: (item.status as ActionItemStatus) || 'pending',
          related_skills: item.related_skills,
          related_tools: item.related_tools,
        })),
        status: agentMode === 'planning' ? 'draft' : 'ready',
        source: agentMode === 'planning' ? 'planning' : 'agent',
      };

      planState.current = plan;

      eventEmitter({
        type: ChatEventType.planCreated,
        data: { plan },
      } as ChatAgentEvent);

      return {
        results: [
          createOtherResult({
            message: `Plan "${title}" created with ${actionItems.length} action items.`,
            plan,
          }),
        ],
      };
    },
  };

  const updatePlanTool: BuiltinToolDefinition<typeof updatePlanSchema> = {
    id: 'planning.update_plan',
    type: ToolType.builtin,
    description:
      'Update an existing plan: modify action item status/description, append new items, or change the plan status.',
    tags: ['planning'],
    schema: updatePlanSchema,
    handler: async ({
      title,
      description,
      action_items: itemUpdates,
      new_items: newItems,
      status,
    }) => {
      if (!planState.current) {
        return {
          results: [createErrorResult('No plan exists. Use create_plan first.')],
        };
      }

      const plan = { ...planState.current };

      if (title !== undefined) {
        plan.title = title;
      }
      if (description !== undefined) {
        plan.description = description;
      }
      if (status !== undefined) {
        plan.status = status;
      }

      if (itemUpdates) {
        plan.action_items = [...plan.action_items];
        for (const update of itemUpdates) {
          if (update.index < 0 || update.index >= plan.action_items.length) {
            return {
              results: [
                createErrorResult(
                  `Invalid action item index ${update.index}. Plan has ${plan.action_items.length} items (0-based).`
                ),
              ],
            };
          }
          const existing = plan.action_items[update.index];
          plan.action_items[update.index] = {
            ...existing,
            ...(update.description !== undefined ? { description: update.description } : {}),
            ...(update.status !== undefined ? { status: update.status } : {}),
            ...(update.related_skills !== undefined
              ? { related_skills: update.related_skills }
              : {}),
            ...(update.related_tools !== undefined ? { related_tools: update.related_tools } : {}),
          };
        }
      }

      if (newItems && newItems.length > 0) {
        const totalItems = (plan.action_items?.length ?? 0) + newItems.length;
        if (totalItems > MAX_PLAN_ITEMS) {
          return {
            results: [
              createErrorResult(
                `Cannot add ${newItems.length} items — plan would have ${totalItems} items, exceeding the ${MAX_PLAN_ITEMS} item limit.`
              ),
            ],
          };
        }
        plan.action_items = [
          ...plan.action_items,
          ...newItems.map((item) => ({
            description: item.description,
            status: (item.status as ActionItemStatus) || 'pending',
            related_skills: item.related_skills,
            related_tools: item.related_tools,
          })),
        ];
      }

      planState.current = plan;

      eventEmitter({
        type: ChatEventType.planUpdated,
        data: { plan },
      } as ChatAgentEvent);

      return {
        results: [
          createOtherResult({
            message: 'Plan updated successfully.',
            plan,
          }),
        ],
      };
    },
  };

  const suggestPlanningModeTool: BuiltinToolDefinition<typeof suggestPlanningModeSchema> = {
    id: 'planning.suggest_planning_mode',
    type: ToolType.builtin,
    description:
      'Suggest that the user switch to planning mode when the current question is complex and would benefit from a structured plan. Only use this in agent mode.',
    tags: ['planning'],
    schema: suggestPlanningModeSchema,
    handler: async ({ reason }) => {
      eventEmitter({
        type: ChatEventType.modeSuggestion,
        data: {
          suggested_mode: 'planning' as AgentMode,
          reason,
        },
      } as ChatAgentEvent);

      return {
        results: [
          createOtherResult({
            message: 'Planning mode suggestion sent to the user.',
            reason,
          }),
        ],
      };
    },
  };

  const listAvailableToolsTool: BuiltinToolDefinition<typeof listAvailableToolsSchema> = {
    id: 'planning.list_available_tools',
    type: ToolType.builtin,
    description:
      'List all tools available to the agent, including their IDs and descriptions. Use this to discover capabilities before creating a plan.',
    tags: ['planning'],
    schema: listAvailableToolsSchema,
    handler: async ({ filter }) => {
      const tools = await toolProvider.list({ request });
      let toolSummaries = tools.map((tool) => ({
        id: tool.id,
        description: tool.description,
        type: tool.type,
        tags: tool.tags,
      }));

      if (filter) {
        const keyword = filter.toLowerCase();
        toolSummaries = toolSummaries.filter(
          (tool) =>
            tool.id.toLowerCase().includes(keyword) ||
            (tool.description && tool.description.toLowerCase().includes(keyword))
        );
      }

      return {
        results: [
          createOtherResult({
            tools: toolSummaries,
            count: toolSummaries.length,
          }),
        ],
      };
    },
  };

  const allTools: Array<BuiltinToolDefinition<any>> = [createPlanTool, updatePlanTool];

  // Only include suggest_planning_mode in agent mode (no point suggesting planning in planning mode)
  if (agentMode === 'agent') {
    allTools.push(suggestPlanningModeTool);
  }

  // list_available_tools is useful in both modes
  allTools.push(listAvailableToolsTool);

  return allTools.map((tool) => builtinToolToExecutable({ tool, runner }));
};
