/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { evalsTools, otherResult, toErrorResult } from './common';
import type { EvalExperimentsToolDeps } from './deps';

const schema = z.object({
  include: z
    .enum(['agents', 'tools', 'all'])
    .optional()
    .describe('Which target types to list. Defaults to "all".'),
  search: z
    .string()
    .optional()
    .describe('Optional case-insensitive substring to filter targets by id, name, or description.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Maximum number of targets to return per type. Defaults to 100.'),
});

const matches = (search: string | undefined, ...fields: Array<string | undefined>): boolean => {
  if (!search) {
    return true;
  }
  const needle = search.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
};

/**
 * Lists the Agent Builder agents and tools that can be evaluated as experiment targets.
 */
export const listEvalTargetsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listTargets,
  type: ToolType.builtin,
  description:
    'List the Agent Builder agents and tools that can be evaluated. Returns agent_id / tool_id values (with names, descriptions, and tool type) to use as the experiment target.',
  schema,
  handler: async ({ include = 'all', search, limit = 100 }, { request }) => {
    try {
      const { agentBuilder } = await deps.getStartDependencies();
      const result: Record<string, unknown> = {};

      if (include === 'agents' || include === 'all') {
        const registry = await agentBuilder.agents.getRegistry({ request });
        const agents = await registry.list();
        result.agents = agents
          .filter((agent) => matches(search, agent.id, agent.name, agent.description))
          .slice(0, limit)
          .map((agent) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
          }));
      }

      if (include === 'tools' || include === 'all') {
        const registry = await agentBuilder.tools.getRegistry({ request });
        const tools = await registry.list();
        result.tools = tools
          .filter((tool) => matches(search, tool.id, tool.description))
          .slice(0, limit)
          .map((tool) => ({
            id: tool.id,
            type: tool.type,
            description: tool.description,
          }));
      }

      return otherResult(result);
    } catch (error) {
      return toErrorResult(error, 'Failed to list evaluation targets');
    }
  },
});
