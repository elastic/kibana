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
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SandboxConnectionManager } from './grpc_client';
import type { ResolveConnectorCredentials } from './connector_credentials';
import { redactSecrets } from './connector_credentials';
import { getScopedConversationId, getSandboxCallContext } from './tool_utils';

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
  connector_id: z
    .string()
    .optional()
    .describe(
      'Connector whose credentials this command needs (see /workspace/connectors.md). Its config and secrets are exposed to this command only, as CONNECTOR_CONFIG_<KEY> / CONNECTOR_SECRET_<KEY> environment variables, and are gone when the command exits.'
    ),
});

export const createSandboxBashTool = ({
  connectionManager,
  resolveConnectorCredentials,
  getSpaceId,
  logger,
}: {
  connectionManager: SandboxConnectionManager;
  resolveConnectorCredentials?: ResolveConnectorCredentials;
  getSpaceId: (request: KibanaRequest) => string;
  logger: Logger;
}): BuiltinToolDefinition<typeof sandboxBashSchema> => ({
  id: SANDBOX_BASH_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Execute a bash command inside a sandboxed container. Use this to run shell commands, scripts, or any computation that requires a shell environment. Python 3 is available as `python` (via /home/appuser/.venv/bin/python). The default working directory is /workspace. To call an external service through a Kibana connector, read /workspace/connectors.md and pass the connector id as `connector_id`: the connector credentials are then available to that single command as CONNECTOR_* environment variables (e.g. `curl -H "Authorization: Bearer $CONNECTOR_SECRET_TOKEN" "$CONNECTOR_CONFIG_APIURL/..."`).',
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
    const { command, working_directory, env, timeout_seconds, connector_id } = params;

    const conversationId = getScopedConversationId(context, getSpaceId);

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

    const callContext = getSandboxCallContext(context);

    // Connector credentials are resolved in Kibana and scoped to this one command's environment.
    // The sandbox never holds a credential-retrieval primitive of its own.
    let credentialEnv: Record<string, string> = {};
    let secretValues: readonly string[] = [];
    if (connector_id) {
      if (!resolveConnectorCredentials) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: 'Connector credentials are not available in this deployment.' },
            },
          ],
        };
      }
      const resolved = await resolveConnectorCredentials(connector_id, callContext);
      if ('errorMessage' in resolved) {
        return {
          results: [{ type: ToolResultType.error, data: { message: resolved.errorMessage } }],
        };
      }
      credentialEnv = resolved.env;
      secretValues = resolved.secretValues;
    }

    logger.debug(`Executing sandbox bash command for conversation ${conversationId}: ${command}`);

    try {
      // Prepend the venv bin dir so `python` resolves without requiring a full path.
      // Credential vars are applied last so agent-supplied env cannot shadow them.
      const mergedEnv: Record<string, string> = {
        PATH: `/home/appuser/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
        ...env,
        ...credentialEnv,
      };

      const result = await connectionManager.runCommand(
        conversationId,
        {
          command,
          directory: working_directory,
          env: mergedEnv,
          timeout_seconds,
        },
        callContext
      );

      const { exit_code, timed_out } = result;
      const stdout = redactSecrets(result.stdout, secretValues);
      const stderr = redactSecrets(result.stderr, secretValues);

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
