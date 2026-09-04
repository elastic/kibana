/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as path from 'path';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from './grpc_client';
import { getConversationId, resolveAbsolutePath } from './tool_utils';

export const SANDBOX_WRITE_FILE_TOOL_ID = 'nightshift_sandbox_write_file';

const writeFileSchema = z.object({
  file_path: z
    .string()
    .max(4096)
    .describe(
      'Path for the file to write. Absolute paths are used as-is; relative paths are resolved under /workspace. Parent directories are created automatically.'
    ),
  content: z
    .string()
    .max(10 * 1024 * 1024)
    .describe('Full content to write. Overwrites the file if it already exists.'),
});

export const createSandboxWriteFileTool = ({
  connectionManager,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  logger: Logger;
}): BuiltinToolDefinition<typeof writeFileSchema> => ({
  id: SANDBOX_WRITE_FILE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Write (overwrite) a file in the sandbox. Parent directories are created automatically. Use sandbox_str_replace for partial edits; use this tool for new files or complete rewrites.',
  tags: ['sandbox', 'file'],
  schema: writeFileSchema,
  annotations: {
    title: 'Write File',
    readOnlyHint: false,
    destructiveHint: true,
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
    logger.debug(`sandbox_write_file: ${resolvedPath} (${params.content.length} chars)`);

    try {
      const parentDir = path.posix.dirname(resolvedPath);
      if (parentDir && parentDir !== '.' && parentDir !== '/') {
        await connectionManager.mkdirs(conversationId, [parentDir], context.request);
      }

      const contentBuf = Buffer.from(params.content, 'utf8');
      const writeResult = await connectionManager.writeFiles(
        conversationId,
        [{ path: resolvedPath, content: contentBuf }],
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

      const lineCount = params.content.split('\n').length;
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { text: `Wrote ${lineCount} line(s) to ${params.file_path}.` },
          },
        ],
      };
    } catch (error) {
      logger.error(`sandbox_write_file failed: ${error}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to write file: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
