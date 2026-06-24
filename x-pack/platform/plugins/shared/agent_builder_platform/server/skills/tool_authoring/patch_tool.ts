/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { EsqlToolConfig, EsqlToolParam } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { TOOL_ATTACHMENT_TYPE, type ToolAttachmentData } from '../../../common/attachments';
import { validateEsqlConfigForChat } from './validate_esql_config';

const queryPatchSchema = z.object({
  find: z
    .string()
    .describe(
      'Exact substring to find in the current ES|QL query. Must match exactly once; include enough surrounding context to make it unique.'
    ),
  replace: z.string().describe('Replacement text. Use an empty string to delete the matched text.'),
});

const paramShape = z.object({
  type: z.enum(['string', 'integer', 'float', 'boolean', 'date', 'array']),
  description: z.string(),
  optional: z.boolean().optional(),
  defaultValue: z
    .union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())])
    .optional(),
});

const paramUpdateShape = paramShape
  .partial()
  .describe(
    'Partial param definition. Only the listed fields are overwritten; omitted fields keep their current value.'
  );

const patchToolSchema = z.object({
  attachment_id: z
    .string()
    .describe('Attachment id of the existing `tool` draft (returned by `propose_tool`).'),
  description: z.string().optional().describe('Replacement one-line description.'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Replacement tags array (entire list is replaced, not merged).'),
  query: z
    .string()
    .optional()
    .describe(
      'Full replacement for the ES|QL query. Use this for large rewrites; prefer `query_patches` for small edits. If both are present, `query` is applied first, then `query_patches`.'
    ),
  query_patches: z
    .array(queryPatchSchema)
    .optional()
    .describe(
      'Search-and-replace edits to apply to the ES|QL query. Each patch must match exactly once. Applied in array order.'
    ),
  params_to_add: z
    .record(z.string(), paramShape)
    .optional()
    .describe(
      'New params keyed by name. Fails if a name collides with an existing param — use `params_to_update` for that.'
    ),
  params_to_update: z
    .record(z.string(), paramUpdateShape)
    .optional()
    .describe(
      "Partial updates to existing params, keyed by name. Fails if a name doesn't already exist."
    ),
  params_to_remove: z
    .array(z.string())
    .optional()
    .describe(
      "Param names to remove. Fails if a name doesn't exist. Make sure the query no longer references the removed `?name` — the post-patch ES|QL validation will catch orphans."
    ),
});

export type PatchToolInput = z.infer<typeof patchToolSchema>;

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

/**
 * Inline tool that refines an existing `tool` attachment.
 *
 * Strategy:
 * - Pull the latest version of the attachment from the conversation state.
 * - Apply optional metadata changes (description/tags).
 * - Apply `query` full-replacement first, then `query_patches` search-replace.
 *   Patches that fail to match exactly once cause the entire call to fail
 *   without mutating state.
 * - Apply param add/update/remove operations. Collisions and missing names
 *   are reported as errors before any mutation lands.
 * - Re-validate the merged config via `validateEsqlConfigForChat` so syntax
 *   errors and orphaned params surface here, not at "Create tool" time.
 * - Call `attachments.update`, which auto-bumps the version when the content
 *   hash changes.
 */
export const createPatchToolTool = (): BuiltinSkillBoundedTool<typeof patchToolSchema> => ({
  id: 'patch_tool',
  type: ToolType.builtin,
  description:
    'Refine an existing `tool` attachment by applying targeted edits (description, tags, full or partial query rewrite, add/update/remove params). Preferred over calling `propose_tool` again, which discards the draft history. After patching, re-render the draft via `<render_attachment id="ATTACHMENT_ID" />`.',
  schema: patchToolSchema,
  confirmation: { askUser: 'never' },
  handler: async (input, context) => {
    const { attachments } = context;
    const {
      attachment_id: attachmentId,
      description,
      tags,
      query: queryReplacement,
      query_patches: queryPatches,
      params_to_add: paramsToAdd,
      params_to_update: paramsToUpdate,
      params_to_remove: paramsToRemove,
    } = input;

    const stored = attachments.get(attachmentId, { actor: 'agent' });
    if (!stored) {
      return {
        results: [createErrorResult({ message: `No attachment found for id "${attachmentId}".` })],
      };
    }
    if ((stored.type as string) !== TOOL_ATTACHMENT_TYPE) {
      return {
        results: [
          createErrorResult({
            message: `Attachment "${attachmentId}" is not a tool (type: ${stored.type}).`,
          }),
        ],
      };
    }

    const current = stored.data.data as ToolAttachmentData;
    const errors: string[] = [];

    let nextQuery = current.configuration.query;
    if (queryReplacement !== undefined) {
      nextQuery = queryReplacement;
    }
    if (queryPatches?.length) {
      for (const patch of queryPatches) {
        const result = applySearchReplace(nextQuery, patch.find, patch.replace);
        if (result.error) {
          errors.push(`query: ${result.error}`);
          continue;
        }
        nextQuery = result.content;
      }
    }

    const nextParams: EsqlToolConfig['params'] = { ...current.configuration.params };

    if (paramsToRemove?.length) {
      for (const name of paramsToRemove) {
        if (!(name in nextParams)) {
          errors.push(`params_to_remove: '${name}' is not a defined parameter.`);
          continue;
        }
        delete nextParams[name];
      }
    }

    if (paramsToUpdate) {
      for (const [name, partial] of Object.entries(paramsToUpdate)) {
        if (!(name in nextParams)) {
          errors.push(
            `params_to_update: '${name}' is not a defined parameter. Use params_to_add to introduce it.`
          );
          continue;
        }
        nextParams[name] = { ...nextParams[name], ...partial } as EsqlToolParam;
      }
    }

    if (paramsToAdd) {
      for (const [name, param] of Object.entries(paramsToAdd)) {
        if (name in nextParams) {
          errors.push(
            `params_to_add: '${name}' already exists. Use params_to_update to change it.`
          );
          continue;
        }
        nextParams[name] = param as EsqlToolParam;
      }
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

    const merged: ToolAttachmentData = {
      id: current.id,
      type: current.type,
      description: description ?? current.description,
      ...(tags !== undefined ? { tags } : current.tags !== undefined ? { tags: current.tags } : {}),
      configuration: { query: nextQuery, params: nextParams },
    };

    const configErrors = await validateEsqlConfigForChat(merged.configuration);
    if (configErrors.length > 0) {
      return {
        results: [
          createErrorResult({
            message: `Patched tool is invalid. No changes applied:\n- ${configErrors.join('\n- ')}`,
          }),
        ],
      };
    }

    try {
      const updated = await attachments.update(
        attachmentId,
        {
          data: merged,
          description: merged.description,
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
              tool_id: merged.id,
              tool_type: merged.type,
              param_count: Object.keys(merged.configuration.params).length,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Failed to update tool: ${(error as Error).message}`,
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
          summary: `Patched tool "${data.tool_id}" (v${data.version}, attachment ${data.attachment_id}).`,
          attachment_id: data.attachment_id,
          version: data.version,
          tool_id: data.tool_id,
        },
      },
    ];
  },
});
