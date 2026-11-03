/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import type { BrowserToolResultPayload } from '@kbn/agent-builder-common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import { internalApiPath } from '../../../common/constants';
import { apiPrivileges } from '../../../common/features';
import type { PostBrowserToolResultRequestBody } from '../../../common/http_api/chat';

const MAX_BODY_BYTES = 8 * 1024 * 1024;

const imageSchema = schema.object({
  mime_type: schema.oneOf([schema.literal('image/png'), schema.literal('image/jpeg')]),
  base64: schema.string(),
  name: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
});

const okSchema = schema.object({
  status: schema.literal('ok'),
  content: schema.maybe(
    schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())])
  ),
  images: schema.maybe(schema.arrayOf(imageSchema)),
});

const errorSchema = schema.object({
  status: schema.literal('error'),
  message: schema.string(),
});

export function registerInternalBrowserToolResultRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: `${internalApiPath}/executions/{executionId}/browser_tool_results/{toolCallId}`,
      security: {
        authz: {
          requiredPrivileges: [apiPrivileges.readAgentBuilder],
        },
      },
      options: { access: 'internal', body: { maxBytes: MAX_BODY_BYTES } },
      validate: {
        params: schema.object({
          executionId: schema.string(),
          toolCallId: schema.string(),
        }),
        body: schema.object({
          client_id: schema.maybe(schema.string()),
          result: schema.oneOf([okSchema, errorSchema]),
        }),
      },
    },
    wrapHandler(async (context, request, response) => {
      const {
        execution: executionService,
        conversations: conversationsService,
        browserTools,
      } = getInternalServices();
      const { executionId, toolCallId } = request.params;
      const { client_id: clientId, result } = request.body as PostBrowserToolResultRequestBody;

      const spaceId = (await context.agentBuilder).spaces.getSpaceId();
      const execution = await executionService.getExecution(executionId);
      if (!execution || execution.spaceId !== spaceId) {
        return response.notFound({ body: { message: `Execution not found: ${executionId}` } });
      }

      // Only the execution's owner may answer: the result is fed back into their agent run.
      const conversationClient = await conversationsService.getScopedClient({ request });
      const user = conversationClient.getUser();
      const { owner } = execution;
      // An execution without a recorded owner cannot be attributed: fail closed.
      const isOwner =
        owner != null &&
        (owner.id != null ? owner.id === user.id : owner.username === user.username);
      if (!isOwner) {
        return response.forbidden({
          body: { message: 'Only the owner of the execution can answer its browser tool calls' },
        });
      }

      if (execution.executionMode === AgentExecutionMode.conversation) {
        // Throws when the caller has no access to the conversation.
        await conversationClient.get(execution.agentParams.conversationId);
      }

      const outcome = await browserTools.callClient.answer({
        executionId,
        toolCallId,
        clientId,
        result: result as BrowserToolResultPayload,
      });

      switch (outcome) {
        case 'accepted':
          return response.noContent();
        case 'not_found':
          return response.notFound({
            body: { message: `Browser tool call not found: ${toolCallId}` },
          });
        case 'rejected':
          return response.conflict({
            body: { message: `Browser tool call is not awaiting a result: ${toolCallId}` },
          });
      }
    })
  );
}
