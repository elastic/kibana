/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { AgentExecutionMode, ToolType } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { InternalBuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { HttpSelfService } from '@kbn/core-http-server';
import { capitalize } from 'lodash';
import { dispatchApiRequest, getFailureDetails, prepareApiRequest, targetSchema } from '../../api';
import type { ApiTarget } from '../../api';
import { apiFailureToErrorResult } from './errors';

export interface ApiExecuteResultData {
  target: ApiTarget;
  api: string;
  method: string;
  path: string;
  response: unknown;
}

const executeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The API identifier returned by the ${internalTools.discoverApis} tool, formed from the namespace ` +
        'and name (e.g. "indices.create", "bulk", "cluster.health").'
    ),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      `Flat map of parameter values. Keys must match the field names from the ${internalTools.describeApi} ` +
        'schema. Supply every parameter here regardless of where it belongs in the request: the ' +
        'routing into the URL path, query string, and request body is handled automatically.'
    ),
});

export const createExecuteApiTool = ({
  selfClient,
}: {
  selfClient: HttpSelfService;
}): InternalBuiltinToolDefinition<typeof executeSchema> => {
  return {
    id: internalTools.executeApi,
    type: ToolType.builtin,
    description: `Execute an HTTP API call on behalf of the current user.

- Use \`${internalTools.discoverApis}\` to find the \`api\` identifier, then
  \`${internalTools.describeApi}\` to see the \`params\` it accepts.
- Responses are not summarized, and many of these APIs return very large payloads. Prefer params
  that narrow the response (a filter, a \`size\`/\`per_page\` limit, a \`page\`/\`from\` offset, or an
  explicit field selection) over fetching everything, because an oversized result is truncated
  before you see it.

The response is the raw API response body.`,
    schema: executeSchema,
    handler: async (
      { target, api, params = {} },
      { esClient, request, spaceId, logger, prompts, callContext, executionMode }
    ) => {
      const preparedApiRequest = await prepareApiRequest({ target, api, params, spaceId });
      if (preparedApiRequest.status !== 'prepared') {
        return {
          results: [
            apiFailureToErrorResult(preparedApiRequest, {
              toolId: internalTools.executeApi,
              target,
              api,
              logger,
            }),
          ],
        };
      }

      const { request: apiRequest, destructive } = preparedApiRequest;
      const { method, path } = apiRequest;

      if (destructive) {
        if (executionMode === AgentExecutionMode.standalone) {
          return {
            results: [
              createErrorResult({
                message:
                  `API "${api}" is destructive and needs the user to confirm it, which is not possible ` +
                  `in a non-interactive execution. Use a non-destructive API, or tell the user to run this from a conversation.`,
                metadata: { target, api, method, path },
              }),
            ],
          };
        }

        const promptId = `${internalTools.executeApi}.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              createErrorResult({
                message: `The user declined the destructive call to "${api}". Do not retry it.`,
                metadata: { target, api, method, path },
              }),
            ],
          };
        }

        if (status === ConfirmationStatus.unprompted) {
          return prompts.askForConfirmation({
            id: promptId,
            title: i18n.translate('xpack.agentBuilder.tools.apiExecute.confirmation.title', {
              defaultMessage: 'Allow `{toolName}` to run?',
              values: { toolName: internalTools.executeApi },
            }),
            message: i18n.translate('xpack.agentBuilder.tools.apiExecute.confirmation.message', {
              defaultMessage:
                'The agent wants to call `{method} {path}` on {target}. This operation can modify or delete existing data.',
              values: { method, path, target: capitalize(target) },
            }),
            confirm_text: i18n.translate(
              'xpack.agentBuilder.tools.apiExecute.confirmation.confirmText',
              { defaultMessage: 'Approve' }
            ),
            cancel_text: i18n.translate(
              'xpack.agentBuilder.tools.apiExecute.confirmation.cancelText',
              { defaultMessage: 'Deny' }
            ),
          });
        }
      }

      logger.debug(`${internalTools.executeApi}: ${method} ${path} (target=${target}, api=${api})`);

      try {
        const response = await dispatchApiRequest({
          target,
          apiRequest,
          esClient,
          selfClient,
          request,
        });

        const data: ApiExecuteResultData = { target, api, method, path, response };

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(
          `${internalTools.executeApi}: request failed for "${api}" (target=${target}): ${message}`
        );
        return {
          results: [
            createErrorResult({
              message: `API request failed: ${message}`,
              metadata: { target, api, method, path, ...getFailureDetails(err) },
            }),
          ],
        };
      }
    },
    tags: [],
  };
};
