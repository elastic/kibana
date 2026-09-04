/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from './grpc_client';
import { getConversationId, resolveAbsolutePath } from './tool_utils';

export const SANDBOX_STR_REPLACE_TOOL_ID = 'nightshift_sandbox_str_replace';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const CONTEXT_LINES = 5;

const strReplaceSchema = z.object({
  file_path: z
    .string()
    .max(4096)
    .describe(
      'Path to the file to edit. Absolute paths are used as-is; relative paths are resolved under /workspace.'
    ),
  old_str: z
    .string()
    .max(100_000)
    .describe(
      'The exact string to replace. Must appear exactly once in the file. Include enough surrounding context to be unique.'
    ),
  new_str: z
    .string()
    .max(100_000)
    .describe('The string to replace old_str with. Use an empty string to delete old_str.'),
});

export const createSandboxStrReplaceTool = ({
  connectionManager,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  logger: Logger;
}): BuiltinToolDefinition<typeof strReplaceSchema> => ({
  id: SANDBOX_STR_REPLACE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Replace an exact string in a sandbox file. old_str must appear exactly once; include enough surrounding context to make it unique. Use sandbox_view_file first to confirm line numbers and exact content.',
  tags: ['sandbox', 'file'],
  schema: strReplaceSchema,
  annotations: {
    title: 'Edit File (String Replace)',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (params, context) => {
    const conversationId = getConversationId(context);
    if (!conversationId) {
      return {
        results: [
          { type: ToolResultType.error, data: { message: 'No conversation context available.' } },
        ],
      };
    }

    const resolvedPath = resolveAbsolutePath(params.file_path);
    logger.debug(`sandbox_str_replace: ${resolvedPath}`);

    try {
      const [stat] = await connectionManager.statFiles(conversationId, [resolvedPath], context.request);
      if (!stat.exists || stat.is_dir) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `File not found: ${params.file_path}` },
            },
          ],
        };
      }
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `File too large (${Math.floor(
                  stat.size / 1024 / 1024
                )} MB) to edit with str_replace.`,
              },
            },
          ],
        };
      }

      const [readResult] = await connectionManager.readFiles(
        conversationId,
        [{ path: resolvedPath, maxReadBytes: MAX_FILE_SIZE_BYTES }],
        context.request
      );
      if (!readResult.success) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Error reading file: ${params.file_path}` },
            },
          ],
        };
      }

      const original = readResult.content.toString('utf8');
      const { old_str, new_str } = params;

      // Count occurrences
      let count = 0;
      let idx = -1;
      let searchFrom = 0;
      while (true) {
        const found = original.indexOf(old_str, searchFrom);
        if (found === -1) break;
        count++;
        if (count === 1) idx = found;
        searchFrom = found + 1;
      }

      if (count === 0) {
        // Show context where the first line of old_str appears (partial match aid)
        const firstLine = old_str.split('\n')[0];
        const partialIdx = original.indexOf(firstLine);
        let contextMsg = '';
        if (partialIdx !== -1) {
          const lines = original.split('\n');
          let charCount = 0;
          let lineIdx = 0;
          for (let i = 0; i < lines.length; i++) {
            if (charCount + lines[i].length >= partialIdx) {
              lineIdx = i;
              break;
            }
            charCount += lines[i].length + 1;
          }
          const start = Math.max(0, lineIdx - CONTEXT_LINES);
          const end = Math.min(lines.length - 1, lineIdx + CONTEXT_LINES);
          const width = String(end + 1).length;
          const snippet = lines
            .slice(start, end + 1)
            .map((l, i) => `${String(start + i + 1).padStart(width, ' ')}|${l}`)
            .join('\n');
          contextMsg = `\n\nFirst line of old_str found at line ${
            lineIdx + 1
          } — surrounding context:\n${snippet}`;
        }
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `old_str not found in ${params.file_path}. Ensure the string matches exactly (whitespace, indentation).${contextMsg}`,
              },
            },
          ],
        };
      }

      if (count > 1) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `old_str appears ${count} times in ${params.file_path}. Add more surrounding context to make it unique.`,
              },
            },
          ],
        };
      }

      const updated = original.slice(0, idx) + new_str + original.slice(idx + old_str.length);

      const oldLines = old_str.split('\n').length;
      const newLines = new_str.split('\n').length;

      // Compute the 1-indexed starting line number of the replacement
      const before = original.slice(0, idx);
      const startLine = before.split('\n').length;

      const writeResult = await connectionManager.writeFiles(
        conversationId,
        [{ path: resolvedPath, content: Buffer.from(updated, 'utf8') }],
        context.request
      );
      if (!writeResult[0]?.success) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `Failed to write file: ${params.file_path}` },
            },
          ],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              text: `Replaced ${oldLines} line(s) starting at line ${startLine} with ${newLines} line(s) in ${params.file_path}.`,
            },
          },
        ],
      };
    } catch (error) {
      logger.error(`sandbox_str_replace failed: ${error}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to edit file: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
