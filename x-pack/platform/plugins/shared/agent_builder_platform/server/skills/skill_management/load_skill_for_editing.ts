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
import { SKILL_ATTACHMENT_TYPE, type SkillAttachmentData } from '../../../common/attachments';

const loadSkillForEditingSchema = z.object({
  skill_id: z
    .string()
    .min(1)
    .describe(
      'ID of the existing user-created skill to load for editing. Must match the id of a persisted, non-readonly skill.'
    ),
});

/**
 * Inline tool that fetches an existing user-created skill and captures it as a
 * versioned `skill` attachment in the conversation.
 *
 * The attachment pre-populates the draft with the skill's current content so
 * the agent can immediately start making targeted edits via `patch_skill`.
 * The `mode: 'edit'` flag tells the UI to call `PUT` instead of `POST`
 * when the user clicks "Save changes".
 */
export const createLoadSkillForEditingTool = (): BuiltinSkillBoundedTool<
  typeof loadSkillForEditingSchema
> => ({
  id: 'load_skill_for_editing',
  type: ToolType.builtin,
  description:
    'Load an existing user-created skill into a draft attachment. Use this to display a skill to the user OR to begin editing it. Fetches the skill by id, creates a versioned `skill` attachment pre-populated with the current content, and returns `attachment_id`. If the user only wants to view the skill, render the draft with `<render_attachment id="ATTACHMENT_ID" />`. If the user wants changes, do NOT render yet — call `patch_skill` first and render once after the final patch so the user sees a single up-to-date card.',
  schema: loadSkillForEditingSchema,
  confirmation: { askUser: 'never' },
  handler: async ({ skill_id: skillId }, context) => {
    const { attachments, skills } = context;

    const skill = await skills.get(skillId);
    if (!skill) {
      return {
        results: [
          createErrorResult({
            message: `Skill "${skillId}" not found. Check the id is correct or list available skills.`,
          }),
        ],
      };
    }

    if (skill.readonly) {
      return {
        results: [
          createErrorResult({
            message: `Skill "${skillId}" is a built-in skill and cannot be edited via chat. Only user-created skills can be modified.`,
          }),
        ],
      };
    }

    const toolIds = await skill.getRegistryTools();
    const data: SkillAttachmentData = {
      mode: 'edit',
      skill: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        content: skill.content,
        tool_ids: toolIds,
        ...(skill.referencedContent?.length ? { referenced_content: skill.referencedContent } : {}),
      },
      originalContent: skill.content,
    };

    try {
      const attachment = await attachments.add(
        {
          type: SKILL_ATTACHMENT_TYPE,
          data,
          description: data.skill.description,
          origin: skill.id,
        },
        'agent'
      );

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version,
              skill_id: data.skill.id,
              skill_name: data.skill.name,
              referenced_files: data.skill.referenced_content?.length ?? 0,
              tool_ids: data.skill.tool_ids,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to create edit draft: ${(error as Error).message}`,
          }),
        ],
      };
    }
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
          summary: `Loaded skill "${data.skill_id}" for editing (v${data.version}) as attachment ${data.attachment_id}.`,
          attachment_id: data.attachment_id,
          version: data.version,
          skill_id: data.skill_id,
        },
      },
    ];
  },
});
