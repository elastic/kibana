/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { skillCreateRequestSchema } from '@kbn/agent-builder-common';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import {
  SKILL_DRAFT_ATTACHMENT_TYPE,
  type SkillDraftAttachmentData,
} from '../../../common/attachments';

const referencedContentSchema = z.object({
  name: z
    .string()
    .describe(
      'File name (without extension). Lowercase letters, numbers, underscores, and hyphens. Forms `[name].md` in the skill folder.'
    ),
  relativePath: z
    .string()
    .describe(
      'Folder relative to the skill, must start with `./`. Use `./` for the skill root or `./examples` (single segment) for a subfolder. Avoid `../`.'
    ),
  content: z.string().describe('Markdown content for this referenced file.'),
});

/**
 * Input schema for the `propose_skill` inline tool.
 *
 * Mirrors `skillCreateRequestSchema` from `@kbn/agent-builder-common` so the
 * draft can be shipped straight to `POST /api/agent_builder/skills` without
 * remapping. The tool re-runs the same Zod schema in its handler to surface
 * any constraint violation as a structured error result.
 */
const proposeSkillSchema = z.object({
  id: z
    .string()
    .describe(
      'Stable slug identifier for the skill. Lowercase letters, numbers, hyphens, and underscores; must start and end with a letter or number. Max 64 characters.'
    ),
  name: z
    .string()
    .describe(
      'Human-readable name. Letters, numbers, spaces, hyphens, and underscores; must start and end with a letter or number. Max 64 characters.'
    ),
  description: z
    .string()
    .describe(
      'One-line summary of when to use this skill. Surfaced in the skill catalog and presented to other agents. Max 1024 characters.'
    ),
  content: z
    .string()
    .describe(
      'Full markdown body of `SKILL.md`. Begin with a "When to Use" section, then list available tools, then describe the workflow with concrete examples. Do NOT include YAML front matter; the runtime injects it from `name`/`description`.'
    ),
  tool_ids: z
    .array(z.string())
    .describe(
      'Up to 5 registry tool IDs this skill needs access to. Each ID must already exist in the tool registry. Use `list_tools` first if you are unsure.'
    ),
  referenced_content: z
    .array(referencedContentSchema)
    .optional()
    .describe(
      'Optional supporting markdown files (examples, reference snippets). Up to 100 entries. Each entry resolves to `[basePath]/[skill-name]/[relativePath]/[name].md` in the agent filestore.'
    ),
});

export type ProposeSkillInput = z.infer<typeof proposeSkillSchema>;

/**
 * Inline tool that captures a draft skill payload as a versioned `skill_draft`
 * attachment in the conversation.
 *
 * Validation flow:
 * 1. The Zod schema above provides the structural shape.
 * 2. We re-validate against `skillCreateRequestSchema` to enforce the same
 *    regex/length/refinement rules used by the public create endpoint, so the
 *    draft is guaranteed to round-trip into `POST /api/agent_builder/skills`.
 * 3. The attachment type's `validate` runs again inside `attachments.add`,
 *    producing a third gate.
 *
 * The handler returns the new attachment id and version so the assistant can
 * emit `<render_attachment id="..." />` to display the draft card inline.
 */
export const createProposeSkillTool = (): BuiltinSkillBoundedTool<typeof proposeSkillSchema> => ({
  id: 'propose_skill',
  type: ToolType.builtin,
  description:
    'Propose a new skill as an inline draft. Creates a versioned `skill_draft` attachment containing the full skill payload (id, name, description, content, tool_ids, referenced_content). After this call, render the draft inline by emitting `<render_attachment id="ATTACHMENT_ID" />`. Use `patch_skill_draft` to refine the draft instead of calling `propose_skill` again unless the user wants to start over.',
  schema: proposeSkillSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    const { attachments } = context;

    const parsed = skillCreateRequestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        results: [
          createErrorResult({
            message: `Invalid skill draft: ${parsed.error.issues
              .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
              .join('; ')}`,
          }),
        ],
      };
    }

    const data: SkillDraftAttachmentData = parsed.data;

    try {
      const attachment = await attachments.add(
        {
          type: SKILL_DRAFT_ATTACHMENT_TYPE,
          data,
          description: data.description,
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
              skill_id: data.id,
              skill_name: data.name,
              referenced_files: data.referenced_content?.length ?? 0,
              tool_ids: data.tool_ids,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to capture skill draft: ${(error as Error).message}`,
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
          summary: `Drafted skill "${data.skill_id}" (v${data.version}) as attachment ${data.attachment_id}.`,
          attachment_id: data.attachment_id,
          version: data.version,
          skill_id: data.skill_id,
        },
      },
    ];
  },
});
