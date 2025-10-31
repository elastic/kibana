/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { toBooleanRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import type { Observable } from 'rxjs';
import { from, map } from 'rxjs';
import { v4 } from 'uuid';
import type { Readable } from 'stream';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { last } from 'lodash';
import { aiAssistantSimulatedFunctionCalling } from '../..';
import { createFunctionResponseMessage } from '../../../common/utils/create_function_response_message';
import { flushBuffer } from '../../service/util/flush_buffer';
import { observableIntoOpenAIStream } from '../../service/util/observable_into_openai_stream';
import { observableIntoStream } from '../../service/util/observable_into_stream';
import { withAssistantSpan } from '../../service/util/with_assistant_span';
import { recallAndScore } from '../../functions/context/utils/recall_and_score';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import type { Instruction } from '../../../common/types';
import {
  assistantScopeType,
  functionRt,
  messageRt,
  publicMessageRt,
  screenContextRt,
} from '../runtime_types';
import type { ObservabilityAIAssistantRouteHandlerResources } from '../types';
import type {
  BufferFlushEvent,
  StreamingChatResponseEventWithoutError,
} from '../../../common/conversation_complete';
import type { ConversationCreateRequest } from '../../../common/types';

const chatCompleteBaseRt = (apiType: 'public' | 'internal') =>
  t.type({
    body: t.intersection([
      t.type({
        messages: t.array(apiType === 'public' ? publicMessageRt : messageRt),
        connectorId: t.string,
        persist: toBooleanRt,
      }),
      t.partial({
        isStream: t.union([t.undefined, toBooleanRt]), // accept undefined in order to default to true
        conversationId: t.string,
        title: t.string,
        disableFunctions: toBooleanRt,
        instructions: t.array(
          t.union([
            t.string,
            t.type({
              id: t.string,
              text: t.string,
            }),
          ])
        ),
      }),
    ]),
  });

const chatCompleteInternalRt = t.intersection([
  chatCompleteBaseRt('internal'),
  t.type({
    body: t.type({
      screenContexts: t.array(screenContextRt),
      scopes: t.array(assistantScopeType),
    }),
  }),
]);

const chatCompletePublicRt = t.intersection([
  chatCompleteBaseRt('public'),
  t.partial({
    body: t.partial({
      actions: t.array(functionRt),
    }),
  }),
]);

async function initializeChatRequest({
  context,
  request,
  plugins: { cloud, actions },
  params: {
    body: { connectorId, scopes },
  },
  service,
}: ObservabilityAIAssistantRouteHandlerResources & {
  params: { body: { connectorId: string; scopes: AssistantScope[] } };
}) {
  await withAssistantSpan('guard_against_invalid_connector', async () => {
    const actionsClient = await (await actions.start()).getActionsClientWithRequest(request);

    const connector = await actionsClient.get({
      id: connectorId,
      throwIfSystemAction: true,
    });

    return connector;
  });

  const [client, cloudStart, simulateFunctionCalling] = await Promise.all([
    service.getClient({ request, scopes }),
    cloud?.start(),
    (await context.core).uiSettings.client.get<boolean>(aiAssistantSimulatedFunctionCalling),
  ]);

  if (!client) {
    throw notImplemented();
  }

  const controller = new AbortController();

  request.events.aborted$.subscribe(() => {
    controller.abort();
  });

  return {
    client,
    isCloudEnabled: Boolean(cloudStart?.isCloudEnabled),
    simulateFunctionCalling,
    signal: controller.signal,
  };
}

const chatRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: t.type({
    body: t.intersection([
      t.type({
        name: t.string,
        systemMessage: t.string,
        messages: t.array(messageRt),
        connectorId: t.string,
        functions: t.array(functionRt),
        scopes: t.array(assistantScopeType),
      }),
      t.partial({
        functionCall: t.string,
      }),
    ]),
  }),
  handler: async (resources): Promise<Readable> => {
    const { params } = resources;

    const {
      body: { name, systemMessage, messages, connectorId, functions, functionCall },
    } = params;

    const { client, simulateFunctionCalling, signal, isCloudEnabled } = await initializeChatRequest(
      resources
    );

    const response$ = client.chat(name, {
      stream: true,
      systemMessage,
      messages,
      connectorId,
      signal,
      ...(functions.length
        ? {
            functions,
            functionCall,
          }
        : {}),
      simulateFunctionCalling,
    });

    return observableIntoStream(response$.pipe(flushBuffer(isCloudEnabled)));
  },
});

const chatRecallRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat/recall',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: t.type({
    body: t.type({
      screenDescription: t.string,
      connectorId: t.string,
      scopes: t.array(assistantScopeType),
      messages: t.array(messageRt),
    }),
  }),
  handler: async (resources): Promise<Readable> => {
    const { client, simulateFunctionCalling, signal, isCloudEnabled } = await initializeChatRequest(
      resources
    );

    const { request, plugins } = resources;

    const actionsClient = await (
      await plugins.actions.start()
    ).getActionsClientWithRequest(request);

    const { connectorId, screenDescription, messages, scopes } = resources.params.body;

    const connector = await actionsClient.get({
      id: connectorId,
      throwIfSystemAction: true,
    });
    const response$ = from(
      recallAndScore({
        analytics: (await resources.plugins.core.start()).analytics,
        chat: (name, params) =>
          client.chat(name, {
            ...params,
            stream: true,
            connectorId,
            simulateFunctionCalling,
            signal,
          }),
        screenDescription,
        logger: resources.logger,
        messages,
        recall: client.recall,
        signal,
        connector,
        scopes,
      })
    ).pipe(
      map(({ llmScores, suggestions, relevantDocuments }) => {
        return createFunctionResponseMessage({
          name: 'context',
          data: {
            suggestions,
            llmScores,
          },
          content: {
            relevantDocuments,
          },
        });
      })
    );

    return observableIntoStream(response$.pipe(flushBuffer(isCloudEnabled)));
  },
});

async function chatComplete(
  resources: ObservabilityAIAssistantRouteHandlerResources & {
    params: t.TypeOf<typeof chatCompleteInternalRt>;
  }
): Promise<{
  response$: Observable<StreamingChatResponseEventWithoutError | BufferFlushEvent>;
  getConversation: () => Promise<ConversationCreateRequest>;
}> {
  const { params, service } = resources;

  const {
    body: {
      messages,
      connectorId,
      conversationId,
      title,
      persist,
      screenContexts,
      instructions: userInstructionsOrStrings,
      disableFunctions,
      scopes,
    },
  } = params;

  resources.logger.debug(`Initializing chat request with ${messages.length} messages`);

  const { client, isCloudEnabled, signal, simulateFunctionCalling } = await initializeChatRequest(
    resources
  );

  const functionClient = await service.getFunctionClient({
    signal,
    resources,
    client,
    screenContexts,
    scopes,
  });

  const userInstructions: Instruction[] | undefined = userInstructionsOrStrings?.map(
    (userInstructionOrString) =>
      typeof userInstructionOrString === 'string'
        ? {
            text: userInstructionOrString,
            id: v4(),
          }
        : userInstructionOrString
  );

  const { response$, getConversation } = client.complete({
    messages,
    connectorId,
    conversationId,
    title,
    persist,
    signal,
    functionClient,
    userInstructions,
    simulateFunctionCalling,
    disableFunctions,
  });

  const responseWithFlushBuffer$ = response$.pipe(flushBuffer(isCloudEnabled));
  return { response$: responseWithFlushBuffer$, getConversation };
}

const chatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: chatCompleteInternalRt,
  handler: async (resources) => {
    const { params } = resources;
    const { response$, getConversation } = await chatComplete(resources);
    const { isStream = true, connectorId } = params.body;

    if (isStream === false) {
      const response = await getConversation();

      return {
        conversationId: response.conversation.id,
        data: last(response.messages)?.message.content,
        connectorId,
      };
    }

    return observableIntoStream(response$);
  },
});

const publicChatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: chatCompletePublicRt,
  options: {
    tags: ['observability-ai-assistant'],
  },
  handler: async (resources) => {
    const { params, logger } = resources;
    const { actions, ...bodyParams } = params.body;

    const { response$ } = await chatComplete({
      ...resources,
      params: {
        body: {
          ...bodyParams,
          scopes: ['observability'],
          screenContexts: [
            {
              actions,
            },
          ],
        },
      },
    });

    return observableIntoOpenAIStream(response$, logger);
  },
});

export const chatRoutes = {
  ...chatRoute,
  ...chatRecallRoute,
  ...chatCompleteRoute,
  ...publicChatCompleteRoute,
};
