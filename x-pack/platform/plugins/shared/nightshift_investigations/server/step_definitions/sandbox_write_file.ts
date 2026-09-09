/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dirname } from 'path';
import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { SandboxConnectionManager } from '../tools/sandbox_bash/grpc_client';
import { resolveAbsolutePath } from '../tools/sandbox_bash/tool_utils';

/** Maximum content size for a single workflow write (1 MiB). */
const MAX_CONTENT_BYTES = 1024 * 1024;

/**
 * Writes a file into the sandbox's conversation-scoped workspace.
 *
 * Uses the raw `SandboxApiClient` directly (bypassing `SandboxConnectionManager`'s
 * `ensureInitialized` path) so the initialized-map stays empty and the agent's first
 * tool call still runs `initializeConversation` with the real connector list. This
 * avoids seeding `connectors.md` with zero connectors from a workflow context where no
 * agent configuration is available.
 */
export const sandboxWriteFileStepDefinition = (
  getConnectionManager: () => SandboxConnectionManager | undefined
) =>
  createServerStepDefinition({
    id: 'nightshift.sandboxWriteFile',
    label: 'Write File to Nightshift Sandbox',
    category: StepCategory.Ai,
    description:
      'Writes a file into the Nightshift sandbox for the given conversation. ' +
      'Parent directories are created automatically. ' +
      'Relative paths are anchored to /workspace.',
    inputSchema: z.object({
      conversation_id: z
        .string()
        .min(1)
        .max(1024)
        .describe('Conversation id that namespaces the sandbox.'),
      file_path: z
        .string()
        .min(1)
        .max(4096)
        .describe('Path to write. Relative paths are anchored to /workspace.'),
      content: z.string().max(MAX_CONTENT_BYTES).describe('UTF-8 text content to write.'),
    }),
    outputSchema: z.object({
      file_path: z.string().describe('Absolute path of the file written.'),
      bytes_written: z.number().describe('Number of bytes written.'),
    }),
    handler: async (context) => {
      const { conversation_id, file_path, content } = context.input;

      const manager = getConnectionManager();
      if (!manager) {
        throw new Error(
          'The Nightshift sandbox is not configured — ' +
            'set xpack.nightshift_investigations.sandbox in kibana.yml.'
        );
      }

      const absolutePath = resolveAbsolutePath(file_path);
      const parentDir = dirname(absolutePath);
      if (parentDir !== '/') {
        await manager.apiClient.mkdirs(conversation_id, [parentDir]);
      }

      const contentBuffer = Buffer.from(content, 'utf8');
      await manager.apiClient.writeFiles(conversation_id, [
        { path: absolutePath, content: contentBuffer },
      ]);

      return {
        output: {
          file_path: absolutePath,
          bytes_written: contentBuffer.byteLength,
        },
      };
    },
  });
