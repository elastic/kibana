/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { notImplemented } from '@hapi/boom';
import { toBooleanRt } from '@kbn/io-ts-utils';
import { context as otelContext } from '@opentelemetry/api';
import * as t from 'io-ts';
import { from, map } from 'rxjs';
import { Readable } from 'stream';
import { AssistantScope } from '@kbn/ai-assistant-common';
import { aiAssistantSimulatedFunctionCalling } from '../..';
import { createFunctionResponseMessage } from '../../../common/utils/create_function_response_message';
import { withoutTokenCountEvents } from '../../../common/utils/without_token_count_events';
import { LangTracer } from '../../service/client/instrumentation/lang_tracer';
import { flushBuffer } from '../../service/util/flush_buffer';
import { observableIntoOpenAIStream } from '../../service/util/observable_into_openai_stream';
import { observableIntoStream } from '../../service/util/observable_into_stream';
import { withAssistantSpan } from '../../service/util/with_assistant_span';
import { recallAndScore } from '../../utils/recall/recall_and_score';
import { createObservabilityAIAssistantServerRoute } from '../create_observability_ai_assistant_server_route';
import { assistantScopeType, functionRt, messageRt, screenContextRt } from '../runtime_types';
import { ObservabilityAIAssistantRouteHandlerResources } from '../types';

const chatCompleteBaseRt = t.type({
  body: t.intersection([
    t.type({
      messages: t.array(messageRt),
      connectorId: t.string,
      persist: toBooleanRt,
    }),
    t.partial({
      conversationId: t.string,
      title: t.string,
      disableFunctions: t.union([
        toBooleanRt,
        t.type({
          except: t.array(t.string),
        }),
      ]),
      instructions: t.array(
        t.intersection([
          t.partial({ id: t.string }),
          t.type({
            text: t.string,
            instruction_type: t.union([
              t.literal('user_instruction'),
              t.literal('application_instruction'),
            ]),
          }),
        ])
      ),
    }),
  ]),
});

const chatCompleteInternalRt = t.intersection([
  chatCompleteBaseRt,
  t.type({
    body: t.type({
      screenContexts: t.array(screenContextRt),
      scopes: t.array(assistantScopeType),
    }),
  }),
]);

const chatCompletePublicRt = t.intersection([
  chatCompleteBaseRt,
  t.partial({
    body: t.partial({
      actions: t.array(functionRt),
    }),
    query: t.partial({
      format: t.union([t.literal('default'), t.literal('openai')]),
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
      body: { name, messages, connectorId, functions, functionCall },
    } = params;

    const { client, simulateFunctionCalling, signal, isCloudEnabled } = await initializeChatRequest(
      resources
    );

    const response$ = client.chat(name, {
      stream: true,
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
      tracer: new LangTracer(otelContext.active()),
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
      prompt: t.string,
      context: t.string,
      connectorId: t.string,
      scopes: t.array(assistantScopeType),
    }),
  }),
  handler: async (resources): Promise<Readable> => {
    const { client, simulateFunctionCalling, signal, isCloudEnabled } = await initializeChatRequest(
      resources
    );

    const { connectorId, prompt, context } = resources.params.body;

    const response$ = from(
      recallAndScore({
        analytics: (await resources.plugins.core.start()).analytics,
        chat: (name, params) =>
          client
            .chat(name, {
              ...params,
              stream: true,
              connectorId,
              simulateFunctionCalling,
              signal,
              tracer: new LangTracer(otelContext.active()),
            })
            .pipe(withoutTokenCountEvents()),
        context,
        logger: resources.logger,
        messages: [],
        userPrompt: prompt,
        recall: client.recall,
        signal,
      })
    ).pipe(
      map(({ scores, suggestions, relevantDocuments }) => {
        return createFunctionResponseMessage({
          name: 'context',
          data: {
            suggestions,
            scores,
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
) {
  const { params, service } = resources;

  const {
    body: {
      messages,
      connectorId,
      conversationId,
      title,
      persist,
      screenContexts,
      instructions,
      disableFunctions,
      scopes,
    },
  } = params;

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

  const response$ = client.complete({
    messages,
    connectorId,
    conversationId,
    title,
    persist,
    signal,
    functionClient,
    instructions,
    simulateFunctionCalling,
    disableFunctions,
  });

  return response$.pipe(flushBuffer(isCloudEnabled));
}

const chatCompleteRoute = createObservabilityAIAssistantServerRoute({
  endpoint: 'POST /internal/observability_ai_assistant/chat/complete',
  security: {
    authz: {
      requiredPrivileges: ['ai_assistant'],
    },
  },
  params: chatCompleteInternalRt,
  handler: async (resources): Promise<Readable> => {
    return observableIntoStream(await chatComplete(resources));
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
  handler: async (resources): Promise<Readable> => {
    const { params, logger } = resources;

    const {
      body: { actions, ...restOfBody },
      query = {},
    } = params;

    const { format = 'default' } = query;

    const response$ = await chatComplete({
      ...resources,
      params: {
        body: {
          ...restOfBody,
          scopes: ['observability'],
          screenContexts: [
            {
              actions,
            },
          ],
        },
      },
    });

    return format === 'openai'
      ? observableIntoOpenAIStream(response$, logger)
      : observableIntoStream(response$);
  },
});

export const chatRoutes = {
  ...chatRoute,
  ...chatRecallRoute,
  ...chatCompleteRoute,
  ...publicChatCompleteRoute,
};
