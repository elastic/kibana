/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, RunContextStackEntry } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from './grpc_client';

export const SANDBOX_BASH_TOOL_ID = 'nightshift_sandbox_bash';

const sandboxBashSchema = z.object({
  command: z
    .string()
    .describe('Bash command to execute in the sandbox (runs as: bash -c <command>)'),
  working_directory: z
    .string()
    .optional()
    .describe('Working directory inside the sandbox (default: /workspace)'),
  env: z
    .record(z.string(), z.string())
    .optional()
    .describe('Additional environment variables to set for this command'),
  timeout_seconds: z
    .number()
    .optional()
    .describe('Timeout in seconds; 0 or omitted uses the server default of 600s'),
});

export const createSandboxBashTool = ({
  connectionManager,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  logger: Logger;
}): BuiltinToolDefinition<typeof sandboxBashSchema> => ({
  id: SANDBOX_BASH_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Execute a bash command inside a sandboxed container. Use this to run shell commands, scripts, or any computation that requires a shell environment. Python 3 is available as `python` (via /home/appuser/.venv/bin/python). The default working directory is /workspace.',
  tags: ['sandbox', 'bash'],
  schema: sandboxBashSchema,
  annotations: {
    title: 'Run Bash Command',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (params, context) => {
    const { command, working_directory, env, timeout_seconds } = params;

    // Resolve the conversation ID from the agent stack entry so each conversation
    // gets its own isolated sandbox via the connection manager.
    const conversationId = (context.runContext.stack as RunContextStackEntry[])
      .filter((e) => e.type === 'agent')
      .map((e) => (e as Extract<RunContextStackEntry, { type: 'agent' }>).conversationId)
      .find(Boolean);

    if (!conversationId) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Cannot run sandbox command: no conversation context available.' },
          },
        ],
      };
    }

    logger.debug(`Executing sandbox bash command for conversation ${conversationId}: ${command}`);

    try {
      // Prepend the venv bin dir so `python` resolves without requiring a full path.
      // BASH_ENV causes bash to source /workspace/.env on every non-interactive invocation,
      // making seeded connector credentials available without explicit re-sourcing.
      const mergedEnv: Record<string, string> = {
        PATH: `/home/appuser/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        BASH_ENV: '/workspace/.env',
        ...env,
      };

      const result = await connectionManager.runCommand(
        conversationId,
        {
          command,
          directory: working_directory,
          env: mergedEnv,
          timeout_seconds,
        },
        context.request
      );

      const { stdout, stderr, exit_code, timed_out } = result;

      if (timed_out || exit_code !== 0) {
        const message = [
          timed_out ? 'Command timed out.' : `Command exited with code ${exit_code}.`,
          stdout ? `stdout:\n${stdout}` : '',
          stderr ? `stderr:\n${stderr}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { stdout, stderr, exit_code },
          },
        ],
      };
    } catch (error) {
      logger.error(`Sandbox bash tool failed: ${error}`);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to execute sandbox command: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          },
        ],
      };
    }
  },
});
