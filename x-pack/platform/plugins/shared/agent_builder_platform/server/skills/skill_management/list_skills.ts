/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';

export interface ListedSkill {
  id: string;
  name: string;
  description: string;
}

const projectListedSkill = (skill: InternalSkillDefinition): ListedSkill => ({
  id: skill.id,
  name: skill.name,
  description: skill.description,
});

const listSkillsSchema = z.object({}).describe('No parameters.');

export const createListSkillsTool = (): BuiltinSkillBoundedTool<typeof listSkillsSchema> => ({
  id: 'list_skills',
  type: ToolType.builtin,
  description:
    "List every user-created Agent Builder skill available in this space, returning each skill's id, name, and short description. Call this to confirm a skill id before calling `load_skill_for_editing` — never guess or invent an id.",
  schema: listSkillsSchema,
  confirmation: { askUser: 'never' },
  handler: async (_input, context) => {
    const { skills } = context;

    try {
      const allSkills = await skills.list();
      const userSkills = allSkills.filter((s) => !s.readonly);
      const projected = userSkills.map(projectListedSkill);

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              skills: projected,
              total: projected.length,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to list skills: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
  summarizeToolReturn: (toolReturn) => {
    if (toolReturn.results.length === 0) return undefined;
    const result = toolReturn.results[0];
    if (!isOtherResult(result)) return undefined;
    const data = result.data as { total?: number };
    const total = data.total ?? 0;
    return [
      {
        ...result,
        data: {
          summary: `Listed ${total} user-created skill${total === 1 ? '' : 's'}.`,
          total,
        },
      },
    ];
  },
});
