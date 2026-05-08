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

const contentPatchSchema = z.object({
  find: z
    .string()
    .describe(
      'Exact substring to find in the current `content`. Must match exactly once; include enough surrounding context to make it unique.'
    ),
  replace: z
    .string()
    .describe('Replacement text. Use an empty string to delete the matched text.'),
});

const referencedFilePatchSchema = z.object({
  name: z.string().describe('`name` of an existing referenced file to patch.'),
  relativePath: z
    .string()
    .optional()
    .describe(
      'Optional `relativePath` to disambiguate when multiple referenced files share the same `name`. Defaults to matching by `name` alone.'
    ),
  find: z.string().describe('Exact substring to find in the file content (must match exactly once).'),
  replace: z.string().describe('Replacement text. Empty string deletes the matched text.'),
});

const referencedFileAddSchema = z.object({
  name: z
    .string()
    .describe(
      'File name (without extension). Lowercase letters, numbers, underscores, and hyphens.'
    ),
  relativePath: z
    .string()
    .describe('Folder relative to the skill, must start with `./`. Avoid `../`.'),
  content: z.string().describe('Markdown content for the new file.'),
});

const referencedFileRemoveSchema = z.object({
  name: z.string().describe('`name` of the referenced file to remove.'),
  relativePath: z
    .string()
    .optional()
    .describe('Optional `relativePath` to disambiguate when names collide.'),
});

const patchSkillDraftSchema = z.object({
  attachment_id: z
    .string()
    .describe('Attachment id of the existing `skill_draft` (returned by `propose_skill`).'),
  name: z.string().optional().describe('Replacement display name.'),
  description: z.string().optional().describe('Replacement one-line description.'),
  tool_ids: z
    .array(z.string())
    .optional()
    .describe(
      'Replacement list of registry tool ids (max 5). Replaces the existing array entirely.'
    ),
  content_patches: z
    .array(contentPatchSchema)
    .optional()
    .describe(
      'Search-and-replace edits to apply to `content`. Each patch must match exactly once. Applied in array order.'
    ),
  referenced_file_patches: z
    .array(referencedFilePatchSchema)
    .optional()
    .describe('Search-and-replace edits to apply to existing referenced files.'),
  referenced_files_to_add: z
    .array(referencedFileAddSchema)
    .optional()
    .describe('New referenced files to append to the draft.'),
  referenced_files_to_remove: z
    .array(referencedFileRemoveSchema)
    .optional()
    .describe('Referenced files to remove (matched by `name`, optionally `relativePath`).'),
});

export type PatchSkillDraftInput = z.infer<typeof patchSkillDraftSchema>;

/**
 * Apply a single search-replace patch to a string.
 * The pattern must match exactly once: zero matches and multiple matches both
 * fail loudly so the model never silently corrupts a draft.
 */
const applySearchReplace = (
  source: string,
  find: string,
  replace: string
): { content: string; error?: string } => {
  const occurrences = source.split(find).length - 1;
  if (occurrences === 0) {
    return {
      content: source,
      error: `Text not found: "${find.slice(0, 80)}${find.length > 80 ? '...' : ''}"`,
    };
  }
  if (occurrences > 1) {
    return {
      content: source,
      error: `Text is ambiguous (${occurrences} occurrences). Add surrounding context to make the match unique.`,
    };
  }
  return { content: source.replace(find, replace) };
};

const matchesReferencedFile = (
  item: { name: string; relativePath: string },
  selector: { name: string; relativePath?: string }
): boolean => {
  if (item.name !== selector.name) return false;
  if (selector.relativePath !== undefined && item.relativePath !== selector.relativePath) {
    return false;
  }
  return true;
};

/**
 * Inline tool that refines an existing `skill_draft` attachment.
 *
 * Strategy:
 * - Pull the latest version of the attachment from the conversation state.
 * - Apply optional metadata changes (name/description/tool_ids).
 * - Apply optional search-replace patches to `content` and to individual
 *   referenced files. Patches that fail to match exactly once cause the entire
 *   call to fail without mutating state, so partial drafts can't slip through.
 * - Apply optional add/remove operations on `referenced_content`.
 * - Re-validate the merged payload via `skillCreateRequestSchema` so the draft
 *   stays shippable to `POST /api/agent_builder/skills`.
 * - Call `attachments.update`, which auto-bumps the attachment version when
 *   the content hash changes.
 */
export const createPatchSkillDraftTool = (): BuiltinSkillBoundedTool<
  typeof patchSkillDraftSchema
> => ({
  id: 'patch_skill_draft',
  type: ToolType.builtin,
  description:
    'Refine an existing `skill_draft` attachment by applying targeted edits (rename, edit description, swap tool_ids, search-replace on `content` or referenced files, add/remove referenced files). Preferred over calling `propose_skill` again, which discards the draft history. After patching, re-render the draft via `<render_attachment id="ATTACHMENT_ID" />`.',
  schema: patchSkillDraftSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    const { attachments } = context;
    const {
      attachment_id: attachmentId,
      name,
      description,
      tool_ids: toolIds,
      content_patches: contentPatches,
      referenced_file_patches: refPatches,
      referenced_files_to_add: refsToAdd,
      referenced_files_to_remove: refsToRemove,
    } = input;

    const stored = attachments.get(attachmentId, { actor: 'agent' });
    if (!stored) {
      return {
        results: [createErrorResult({ message: `No attachment found for id "${attachmentId}".` })],
      };
    }
    if ((stored.type as string) !== SKILL_DRAFT_ATTACHMENT_TYPE) {
      return {
        results: [
          createErrorResult({
            message: `Attachment "${attachmentId}" is not a skill_draft (type: ${stored.type}).`,
          }),
        ],
      };
    }

    const current = stored.data.data as SkillDraftAttachmentData;
    let nextContent = current.content;
    let nextReferenced = current.referenced_content
      ? current.referenced_content.map((item) => ({ ...item }))
      : [];
    const errors: string[] = [];

    if (contentPatches?.length) {
      for (const patch of contentPatches) {
        const result = applySearchReplace(nextContent, patch.find, patch.replace);
        if (result.error) {
          errors.push(`content: ${result.error}`);
          continue;
        }
        nextContent = result.content;
      }
    }

    if (refPatches?.length) {
      for (const patch of refPatches) {
        const idx = nextReferenced.findIndex((item) =>
          matchesReferencedFile(item, { name: patch.name, relativePath: patch.relativePath })
        );
        if (idx === -1) {
          errors.push(
            `referenced_content[${patch.name}]: file not found${
              patch.relativePath ? ` at ${patch.relativePath}` : ''
            }`
          );
          continue;
        }
        const result = applySearchReplace(nextReferenced[idx].content, patch.find, patch.replace);
        if (result.error) {
          errors.push(`referenced_content[${patch.name}]: ${result.error}`);
          continue;
        }
        nextReferenced[idx] = { ...nextReferenced[idx], content: result.content };
      }
    }

    if (refsToRemove?.length) {
      for (const selector of refsToRemove) {
        const sizeBefore = nextReferenced.length;
        nextReferenced = nextReferenced.filter((item) => !matchesReferencedFile(item, selector));
        if (nextReferenced.length === sizeBefore) {
          errors.push(
            `referenced_content[${selector.name}]: file not found${
              selector.relativePath ? ` at ${selector.relativePath}` : ''
            }`
          );
        }
      }
    }

    if (refsToAdd?.length) {
      nextReferenced.push(
        ...refsToAdd.map((item) => ({
          name: item.name,
          relativePath: item.relativePath,
          content: item.content,
        }))
      );
    }

    if (errors.length > 0) {
      return {
        results: [
          createErrorResult({
            message: `Patch failed; no changes applied. Errors: ${errors.join('; ')}`,
          }),
        ],
      };
    }

    const merged: SkillDraftAttachmentData = {
      id: current.id,
      name: name ?? current.name,
      description: description ?? current.description,
      content: nextContent,
      tool_ids: toolIds ?? current.tool_ids,
      ...(nextReferenced.length > 0 ? { referenced_content: nextReferenced } : {}),
    };

    const validated = skillCreateRequestSchema.safeParse(merged);
    if (!validated.success) {
      return {
        results: [
          createErrorResult({
            message: `Patched draft is invalid: ${validated.error.issues
              .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
              .join('; ')}`,
          }),
        ],
      };
    }

    try {
      const updated = await attachments.update(
        attachmentId,
        {
          data: validated.data,
          description: validated.data.description,
        },
        'agent'
      );

      if (!updated) {
        return {
          results: [
            createErrorResult({
              message: `Attachment "${attachmentId}" disappeared while patching.`,
            }),
          ],
        };
      }

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              attachment_id: updated.id,
              version: updated.current_version,
              skill_id: validated.data.id,
              skill_name: validated.data.name,
              referenced_files: validated.data.referenced_content?.length ?? 0,
              tool_ids: validated.data.tool_ids,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to update skill draft: ${(error as Error).message}`,
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
          summary: `Patched skill draft "${data.skill_id}" (v${data.version}, attachment ${data.attachment_id}).`,
          attachment_id: data.attachment_id,
          version: data.version,
          skill_id: data.skill_id,
        },
      },
    ];
  },
});
