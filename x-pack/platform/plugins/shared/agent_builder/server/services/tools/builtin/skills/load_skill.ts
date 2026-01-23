/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server';

const loadSkillSchema = z.object({
  skillId: z.string().describe('The ID of the skill to load.'),
});

/**
 * Creates the load_skill tool.
 * Loads a skill definition from the skill registry by its ID.
 */
export const createLoadSkillTool = (): BuiltinToolDefinition<typeof loadSkillSchema> => ({
  id: platformCoreTools.loadSkill,
  type: ToolType.builtin,
  description:
    'Load a skill definition from the skill registry. Returns the skill ID, name, and body for the specified skill.',
  schema: loadSkillSchema,
  tags: ['skill'],
  handler: async ({ skillId }, context) => {
    const skill = context.skillsService.getSkillDefinition(skillId);

    if (!skill) {
      const allSkills = context.skillsService.list();
      
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.error,
            data: { message: `Skill with ID '${skillId}' not found. These are the available skills: ${allSkills.map(skill => skill.id).join(', ')}` },
          },
        ],
      };
    }

    return {
      results: [
        {
          tool_result_id: getToolResultId(),
          type: ToolResultType.other,
          data: {
            type: 'skill',
            id: skill.id,
            name: skill.name,
            body: skill.body,
          },
        },
      ],
    };
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as Record<string, unknown>;

    return [
      {
        ...result,
        data: {
          summary: `Loaded skill "${data.name || data.id}"`,
          id: data.id,
          name: data.name,
          body: data.body,
        },
      },
    ];
  },
});

