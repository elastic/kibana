/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { MAX_NAME_LENGTH } from '@kbn/evals-plugin/common';
import { errorResult, evalsTools, otherResult, toErrorResult } from './common';
import { hasReadEvalsPrivilege } from './check_privileges';
import type { EvalExperimentsToolDeps } from './deps';

const schema = z.object({
  search: z
    .string()
    .max(MAX_NAME_LENGTH)
    .optional()
    .describe('Optional case-insensitive substring to filter agents by id, name, or description.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe('Maximum number of agents to return. Defaults to 100.'),
});

const matches = (search: string | undefined, ...fields: Array<string | undefined>): boolean => {
  if (!search) {
    return true;
  }
  const needle = search.toLowerCase();
  return fields.some((field) => field?.toLowerCase().includes(needle));
};

/**
 * Lists the Agent Builder agents that can be evaluated as experiment targets.
 */
export const listEvalTargetsTool = (
  deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.listTargets,
  type: ToolType.builtin,
  description:
    'List the Agent Builder agents that can be evaluated. Returns agent_id values (with names and descriptions) to use as the experiment target.',
  schema,
  handler: async ({ search, limit = 100 }, { request, spaceId }) => {
    try {
      const { agentBuilder, security } = await deps.getStartDependencies();
      if (!(await hasReadEvalsPrivilege({ security, request, spaceId }))) {
        return errorResult(
          'You do not have the read_evals privilege required to list evaluation targets in this space.'
        );
      }

      const registry = await agentBuilder.agents.getRegistry({ request });
      const agents = await registry.list();

      return otherResult({
        agents: agents
          .filter((agent) => matches(search, agent.id, agent.name, agent.description))
          .slice(0, limit)
          .map((agent) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description,
          })),
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to list evaluation targets');
    }
  },
});
