/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType, isOtherResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import { platformStreamsMemoryTools } from './tool_ids';
import { getUserFromRequest } from './get_user_from_request';
import type { MemoryToolsOptions } from './types';

const patchOperationSchema = z.object({
  old_text: z
    .string()
    .optional()
    .describe(
      'Exact text to find in the document (must be unique). Omit new_text to delete this text.'
    ),
  new_text: z.string().optional().describe('Replacement text. Only used with old_text.'),
  heading: z
    .string()
    .optional()
    .describe(
      'Target a specific markdown heading. Used with "content" to replace the section, or with "append" to add under it.'
    ),
  content: z
    .string()
    .optional()
    .describe('Replace the entire content under the specified heading with this text.'),
  append: z
    .string()
    .optional()
    .describe('Append this text to the end of the document, or under the specified heading.'),
});

const memoryPatchSchema = z.object({
  id: z.string().optional().describe('Target page by UUID.'),
  name: z.string().optional().describe('Target page by unique name.'),
  operations: z
    .array(patchOperationSchema)
    .min(1)
    .max(20)
    .describe('List of patch operations to apply in order.'),
  change_summary: z.string().describe('Human-readable description of what was changed (required).'),
});

const applySearchReplace = (
  content: string,
  oldText: string,
  newText: string | undefined
): { content: string; applied: boolean; error?: string } => {
  const occurrences = content.split(oldText).length - 1;
  if (occurrences === 0) {
    return { content, applied: false, error: `Text not found: "${oldText.substring(0, 100)}..."` };
  }
  if (occurrences > 1) {
    return {
      content,
      applied: false,
      error: `Text is ambiguous (found ${occurrences} occurrences). Provide more surrounding context to make it unique.`,
    };
  }
  return { content: content.replace(oldText, newText ?? ''), applied: true };
};

const applyHeadingReplace = (
  content: string,
  heading: string,
  newContent: string
): { content: string; applied: boolean; error?: string } => {
  const lines = content.split('\n');
  const headingLower = heading.toLowerCase().replace(/^#+\s*/, '');
  let startIdx = -1;
  let endIdx = lines.length;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim().toLowerCase();
      if (startIdx === -1 && title === headingLower) {
        startIdx = i;
        headingLevel = level;
      } else if (startIdx !== -1 && level <= headingLevel) {
        endIdx = i;
        break;
      }
    }
  }

  if (startIdx === -1) {
    return { content, applied: false, error: `Heading "${heading}" not found` };
  }

  const headingLine = lines[startIdx];
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx);
  const result = [...before, headingLine, newContent, ...after].join('\n');
  return { content: result, applied: true };
};

const applyAppend = (
  content: string,
  text: string,
  heading?: string
): { content: string; applied: boolean; error?: string } => {
  if (!heading) {
    return { content: content + '\n' + text, applied: true };
  }

  const lines = content.split('\n');
  const headingLower = heading.toLowerCase().replace(/^#+\s*/, '');
  let insertIdx = -1;
  let headingLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.*)/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim().toLowerCase();
      if (insertIdx === -1 && title === headingLower) {
        insertIdx = i;
        headingLevel = level;
      } else if (insertIdx !== -1 && level <= headingLevel) {
        // Insert before the next same-or-higher-level heading
        const before = lines.slice(0, i);
        const after = lines.slice(i);
        return { content: [...before, text, ...after].join('\n'), applied: true };
      }
    }
  }

  if (insertIdx === -1) {
    return { content, applied: false, error: `Heading "${heading}" not found` };
  }

  // Heading is the last section — append at end
  return { content: content + '\n' + text, applied: true };
};

export const createMemoryPatchTool = ({
  getMemoryService,
  getSecurity,
}: MemoryToolsOptions): BuiltinToolDefinition<typeof memoryPatchSchema> => ({
  id: platformStreamsMemoryTools.memoryPatch,
  type: ToolType.builtin,
  description:
    'Apply targeted edits to an existing memory page without sending the full document. ' +
    'Supports: (A) search-and-replace with old_text/new_text, ' +
    '(B) heading-level replace with heading/content, ' +
    '(C) append with append (optionally under a heading). ' +
    'Multiple operations can be batched in one call.',
  schema: memoryPatchSchema,
  tags: ['memory'],
  confirmation: { askUser: 'never' },
  handler: async ({ id, name, operations, change_summary: changeSummary }, context) => {
    const memoryService = getMemoryService();
    const { request, esClient } = context;
    const { username: user } = await getUserFromRequest({
      request,
      security: getSecurity(),
      esClient: esClient.asCurrentUser,
    });

    if (!name && !id) {
      return {
        results: [createErrorResult({ message: 'Either "name" or "id" must be provided.' })],
      };
    }

    try {
      const entry = id
        ? await memoryService.get({ id })
        : await memoryService.getByName({ name: name! });

      if (!entry) {
        return {
          results: [createErrorResult({ message: `Memory page not found: ${name ?? id}` })],
        };
      }

      let currentContent = entry.content;
      let appliedCount = 0;
      const errors: string[] = [];

      for (const op of operations) {
        if (op.old_text !== undefined) {
          // Search-and-replace
          const result = applySearchReplace(currentContent, op.old_text, op.new_text);
          if (result.applied) {
            currentContent = result.content;
            appliedCount++;
          } else {
            errors.push(result.error!);
          }
        } else if (op.heading && op.content !== undefined) {
          // Heading-level replace
          const result = applyHeadingReplace(currentContent, op.heading, op.content);
          if (result.applied) {
            currentContent = result.content;
            appliedCount++;
          } else {
            errors.push(result.error!);
          }
        } else if (op.append) {
          // Append
          const result = applyAppend(currentContent, op.append, op.heading);
          if (result.applied) {
            currentContent = result.content;
            appliedCount++;
          } else {
            errors.push(result.error!);
          }
        } else {
          errors.push('Unrecognized operation: must provide old_text, heading+content, or append');
        }
      }

      if (errors.length > 0) {
        return {
          results: [
            createErrorResult({
              message: `Patch failed — all operations rolled back. Errors: ${errors.join('; ')}`,
            }),
          ],
        };
      }

      const updated = await memoryService.update({
        id: entry.id,
        content: currentContent,
        user,
        changeSummary,
      });

      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              id: updated.id,
              name: updated.name,
              version: updated.version,
              operations_applied: appliedCount,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Memory patch failed: ${(error as Error).message}`,
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
          summary: `Patched memory page "${data.name}" (${data.operations_applied} ops, v${data.version})`,
          id: data.id,
          name: data.name,
          version: data.version,
        },
      },
    ];
  },
});
