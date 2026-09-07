/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Logger } from '@kbn/logging';
import { internalTools, ToolType } from '@kbn/agent-builder-common';
import { createOtherResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import { selectRelevantSkills } from '../utils/relevant_skills/select_relevant_skills';

const schema = z.object({
  query: z.string().describe('A short description of the sub-task you need a skill for'),
});

/**
 * On-demand counterpart to the implicit `<relevant_skills>` selection: lets the agent search the
 * agent's skills for a specific sub-task. Discovery only — returns a plain tool result; the agent then
 * calls `load_skill` to actually load a chosen skill's tools.
 */
export const createSearchRelevantSkillsTool = ({
  modelProvider,
  filteredSkills,
  logger,
  abortSignal,
}: {
  modelProvider: ModelProvider;
  filteredSkills: InternalSkillDefinition[];
  logger: Logger;
  abortSignal?: AbortSignal;
}): BuiltinToolDefinition<typeof schema> => ({
  id: internalTools.searchRelevantSkills,
  description: `Search for skills relevant to a sub-task.

Returns skills (id, name, path, description) that match your query. Use this to discover skills for a specific need, then call \`load_skill\` with a returned name or path to load the skill and its specialized tools.`,
  type: ToolType.builtin,
  schema,
  tags: ['skills'],
  handler: async ({ query }) => {
    const selection = await selectRelevantSkills({
      skills: filteredSkills,
      context: { userMessage: query },
      modelProvider,
      logger,
      abortSignal,
    });
    return {
      results: [createOtherResult({ skills: selection.skills })],
    };
  },
});
