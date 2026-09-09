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

export const SANDBOX_VIEW_FILE_TOOL_ID = 'nightshift_sandbox_view_file';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const viewFileSchema = z.object({
  file_path: z
    .string()
    .max(4096)
    .describe(
      'Path to the file. Absolute paths are used as-is; relative paths are resolved under /workspace.'
    ),
  start_line: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('First line to show (1-indexed, default: 1).'),
  end_line: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Last line to show inclusive (default: 0 = end of file).'),
});

export const createSandboxViewFileTool = ({
  connectionManager,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  logger: Logger;
}): BuiltinToolDefinition<typeof viewFileSchema> => ({
  id: SANDBOX_VIEW_FILE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'View sandbox file contents with line numbers. ALWAYS use this instead of `cat`, `head`, `tail`, or `sed -n` in bash. Returns numbered lines for easy reference when editing with sandbox_str_replace. View a specific range to keep output small — avoid reading entire large files. The default working directory is /workspace.',
  tags: ['sandbox', 'file'],
  schema: viewFileSchema,
  annotations: {
    title: 'View File',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
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
    logger.debug(
      `sandbox_view_file: ${resolvedPath} lines ${params.start_line ?? 1}-${
        params.end_line ?? 'end'
      }`
    );

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
                )} MB). Use bash to inspect with head/tail/grep.`,
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

      const raw = readResult.content.toString('utf8');
      const allLines = raw.split('\n');
      // Remove the phantom trailing line that split() adds when content ends with \n.
      if (allLines[allLines.length - 1] === '') allLines.pop();

      const total = allLines.length;
      if (total === 0) {
        return {
          results: [
            { type: ToolResultType.other, data: { text: `File is empty: ${params.file_path}` } },
          ],
        };
      }

      const startLine = params.start_line ?? 1;
      const endLine =
        params.end_line && params.end_line > 0 ? Math.min(total, params.end_line) : total;

      if (startLine > total) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `start_line ${startLine} exceeds file length (${total} lines)` },
            },
          ],
        };
      }
      if (startLine > endLine) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: `start_line (${startLine}) is after end_line (${endLine})` },
            },
          ],
        };
      }

      const noRange =
        (params.start_line == null || params.start_line <= 1) &&
        (!params.end_line || params.end_line <= 0);
      const maxLines = noRange ? 100 : 300;

      const selected = allLines.slice(startLine - 1, endLine);
      const width = String(endLine).length;
      let numbered = selected.map(
        (line, i) => `${String(startLine + i).padStart(width, ' ')}|${line}`
      );

      let header: string;
      if (numbered.length > maxLines) {
        numbered = numbered.slice(0, maxLines);
        const lastShown = startLine + maxLines - 1;
        header = `[${
          params.file_path
        }] lines ${startLine}-${lastShown} of ${total} (truncated — continue with start_line=${
          lastShown + 1
        })`;
      } else {
        header = `[${params.file_path}] lines ${startLine}-${
          startLine + numbered.length - 1
        } of ${total}`;
      }

      return {
        results: [
          { type: ToolResultType.other, data: { text: header + '\n' + numbered.join('\n') } },
        ],
      };
    } catch (error) {
      logger.error(`sandbox_view_file failed: ${error}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to view file: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
