/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate as uuidValidate } from 'uuid';
import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  agentBuilderDefaultAgentId,
  createBadRequestError,
  AgentExecutionMode,
  ConversationAccessControlMode,
  ConversationSourceType,
  ExecutionStatus,
} from '@kbn/agent-builder-common';
import type {
  AgentExecutionService,
  ExecutionConversationSource,
} from '@kbn/agent-builder-server/execution';
import {
  ConnectorOrInferenceIdConflictError,
  resolveConnectorOrInferenceId,
} from '../../common/resolve_connector_or_inference_id';
import type { ChatRequestBodyPayload, ChatResponse } from '../../common/http_api/chat';
import type {
  ChatCallbackAcceptedResponse,
  ChatCallbackRequestBodyPayload,
} from '../../common/http_api/chat_callback';
import { isChatCallbackRequestBodyPayload } from '../../common/http_api/chat_callback';
import { internalApiPath, publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import { validateToolSelection } from '../services/agents/persisted/client/utils/tools';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS, getSSEResponseHeaders } from './utils';
import converseAsyncDescription from './oas/converse_async.text';
import { buildChatResponseFromEvents } from '../services/execution/utils/chat_response';

export const promptResponseEntrySchema = schema.oneOf([
  schema.object({ allow: schema.boolean() }),
  schema.object({ authorized: schema.boolean() }),
  schema.object(
    {
      answers: schema.arrayOf(
        schema.object({
          choice: schema.maybe(schema.arrayOf(schema.number(), { maxSize: 100 })),
          custom: schema.maybe(schema.string({ minLength: 1, maxLength: 20_000 })),
          skipped: schema.maybe(schema.boolean()),
        }),
        { maxSize: 100 }
      ),
    },
    {
      meta: {
        description:
          '**Technical Preview.** Answers to an `ask_user_question` prompt; one entry per question, in order.',
      },
    }
  ),
]);

export const conversePayloadSchema = schema.object({
  agent_id: schema.string({
    defaultValue: agentBuilderDefaultAgentId,
    meta: {
      description: 'The ID of the agent to chat with. Defaults to the default Elastic AI agent.',
    },
  }),
  connector_id: schema.maybe(
    schema.nullable(
      schema.string({
        meta: {
          description:
            'Optional connector ID for the agent to use for model routing. Mutually exclusive with `inference_id`; omit or use only one.',
        },
      })
    )
  ),
  inference_id: schema.maybe(
    schema.nullable(
      schema.string({
        meta: {
          description:
            'Optional inference endpoint ID for model routing (public alias for the same internal identifier as `connector_id`). Mutually exclusive with `connector_id`.',
        },
      })
    )
  ),
  conversation_id: schema.maybe(
    schema.string({
      validate: (v) => (uuidValidate(v) ? undefined : 'conversation_id must be a valid UUID'),
      meta: {
        description: 'Optional existing conversation ID to continue a previous conversation.',
      },
    })
  ),
  execution_id: schema.maybe(
    schema.string({
      validate: (v) => (uuidValidate(v) ? undefined : 'execution_id must be a valid UUID'),
      meta: {
        description:
          'Optional client-generated execution ID. Provide it to address this execution later (for example, to abort it). Must be unique; defaults to a server-generated ID.',
      },
    })
  ),
  input: schema.maybe(
    schema.string({
      meta: { description: 'The user input message to send to the agent.' },
    })
  ),
  prompts: schema.maybe(
    schema.recordOf(schema.string({ minLength: 1, maxLength: 512 }), promptResponseEntrySchema, {
      meta: {
        description:
          'Use this field to respond to a `confirmation`, `authorization`, or `ask_user_question` prompt. Send an `allow` boolean to answer a `confirmation` prompt, an `authorized` boolean to answer an `authorization` prompt, or an `answers` array (one entry per question) to answer an `ask_user_question` prompt.',
      },
    })
  ),
  attachments: schema.maybe(
    schema.arrayOf(
      schema.object(
        {
          id: schema.maybe(
            schema.string({
              meta: { description: 'Optional id for the attachment.' },
            })
          ),
          type: schema.string({
            meta: { description: 'Type of the attachment.' },
          }),
          data: schema.maybe(
            schema.recordOf(schema.string(), schema.any(), {
              meta: {
                description:
                  'Payload of the attachment. Required unless `origin` is provided (content is resolved once at send time).',
              },
            })
          ),
          origin: schema.maybe(
            schema.string({
              meta: {
                description:
                  'Origin string (for example, saved object ID) for by-reference attachments. When provided without `data`, the content is resolved once using the attachment type’s `resolve` hook.',
              },
            })
          ),
          hidden: schema.maybe(
            schema.boolean({
              meta: { description: 'When true, the attachment will not be displayed in the UI.' },
            })
          ),
          description: schema.maybe(
            schema.string({
              maxLength: 1024,
              meta: { description: 'Human-readable label for the attachment.' },
            })
          ),
          group_id: schema.maybe(
            schema.string({
              maxLength: 256,
              meta: {
                description:
                  'Stable identifier for the logical group this attachment belongs to. Attachments sharing the same group_id were submitted together as a single logical entity.',
              },
            })
          ),
        },
        {
          validate: (attachment) => {
            if (attachment.data === undefined && attachment.origin === undefined) {
              return 'Each attachment must include either data or origin (by-reference attachments require origin)';
            }
          },
        }
      ),
      {
        meta: {
          description:
            '**Technical Preview; added in 9.3.0.** Optional attachments to send with the message.',
        },
      }
    )
  ),
  access_control: schema.maybe(
    schema.object(
      {
        access_mode: schema.oneOf(
          [
            schema.literal(ConversationAccessControlMode.Private),
            schema.literal(ConversationAccessControlMode.Public),
          ],
          {
            meta: {
              description:
                'Access mode to apply when creating a new conversation. Set to public to make the conversation visible to other users who can access the underlying agent. This setting is ignored when continuing an existing conversation.',
            },
          }
        ),
      },
      {
        meta: {
          description:
            '**Technical Preview; added in 9.5.0.** Optional conversation access control. Defaults to private.',
        },
      }
    )
  ),
  capabilities: schema.maybe(
    schema.object(
      {
        visualizations: schema.maybe(
          schema.boolean({
            meta: {
              description:
                'When true, allows the agent to render tabular data from tool results as interactive visualizations using custom XML elements in responses.',
            },
          })
        ),
      },
      {
        meta: {
          description:
            'Controls agent capabilities during conversation. Currently supports visualization rendering for tabular tool results.',
        },
      }
    )
  ),
  browser_api_tools: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string({
          meta: { description: 'Unique identifier for the browser API tool.' },
        }),
        description: schema.string({
          meta: { description: 'Description of what the browser API tool does.' },
        }),
        schema: schema.any({
          meta: { description: 'JSON Schema defining the tool parameters (JsonSchema7Type).' },
        }),
      }),
      {
        meta: {
          description:
            'Optional browser API tools to be registered as LLM tools with browser.* namespace. These tools execute on the client side.',
        },
      }
    )
  ),
  configuration_overrides: schema.maybe(
    schema.object(
      {
        instructions: schema.maybe(
          schema.string({
            meta: { description: 'Custom instructions for the agent.' },
          })
        ),
        tools: schema.maybe(
          schema.arrayOf(
            schema.object({
              tool_ids: schema.arrayOf(schema.string()),
            }),
            { meta: { description: 'Tool selection to enable for this execution.' } }
          )
        ),
      },
      {
        meta: {
          description:
            'Runtime configuration overrides. These override the stored agent configuration for this execution only.',
        },
      }
    )
  ),
  action: schema.maybe(
    schema.oneOf([schema.literal('regenerate')], {
      meta: {
        description:
          'The action to perform. "regenerate" re-executes the last round with the original input. Requires conversation_id.',
      },
    })
  ),
  _execution_mode: schema.maybe(
    schema.oneOf([schema.literal('local'), schema.literal('task_manager')], {
      meta: {
        description:
          '**Experimental; added in 9.4.0.** define how to execute the agent (local execution or via task_manager)',
      },
    })
  ),
});

export const callbackConversePayloadSchema = conversePayloadSchema.extends({
  source: schema.maybe(
    schema.object({
      type: schema.literal(ConversationSourceType.Slack),
      external_conversation_id: schema.string({ minLength: 1, maxLength: 1024 }),
      author: schema.maybe(
        schema.object({
          id: schema.string({ minLength: 1, maxLength: 1024 }),
          name: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
          handle: schema.maybe(schema.string({ minLength: 1, maxLength: 1024 })),
        })
      ),
    })
  ),
  callback: schema.object({
    url: schema.string({
      minLength: 1,
      maxLength: 2048,
      validate: (value) => {
        try {
          const parsedUrl = new URL(value);

          if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return 'url must use http or https';
          }
        } catch {
          return 'url must be a valid URL';
        }
      },
    }),
  }),
});

export function registerChatRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const validateAction = (payload: ChatRequestBodyPayload) => {
    if (payload.action === 'regenerate' && !payload.conversation_id) {
      throw createBadRequestError('conversation_id is required when action is regenerate');
    }
  };

  const resolveConnectorIdFromPayload = (payload: ChatRequestBodyPayload): string | undefined => {
    try {
      return resolveConnectorOrInferenceId({
        connectorId: payload.connector_id,
        inferenceId: payload.inference_id,
      });
    } catch (e) {
      if (e instanceof ConnectorOrInferenceIdConflictError) {
        throw createBadRequestError(e.message);
      }
      throw e;
    }
  };

  const validateConfigurationOverrides = async ({
    payload,
    request,
  }: {
    payload: ChatRequestBodyPayload;
    request: KibanaRequest;
  }) => {
    if (payload.configuration_overrides?.tools) {
      const { tools: toolsService } = getInternalServices();
      const toolRegistry = await toolsService.getRegistry({ request });
      const errors = await validateToolSelection({
        toolRegistry,
        request,
        toolSelection: payload.configuration_overrides.tools,
      });
      if (errors.length > 0) {
        throw createBadRequestError(`Invalid tool override: ${errors.join(', ')}`);
      }
    }
  };

  /**
   * Derives execution options shared by all converse routes.
   * Public requests may opt into local or Task Manager execution with _execution_mode,
   * while callback requests always use Task Manager and carry the callback and source.
   */
  const resolveExecutionOptions = (
    payload: ChatRequestBodyPayload | ChatCallbackRequestBodyPayload
  ): {
    useTaskManager: boolean | undefined;
    source: ExecutionConversationSource | undefined;
    callback: { url: string } | undefined;
  } => {
    if (isChatCallbackRequestBodyPayload(payload)) {
      return {
        useTaskManager: true,
        source: payload.source,
        callback: payload.callback,
      };
    }

    const { _execution_mode: executionMode } = payload;

    return {
      useTaskManager:
        executionMode === 'task_manager' ? true : executionMode === 'local' ? false : undefined,
      source: undefined,
      callback: undefined,
    };
  };

  const executeAgent = async ({
    payload,
    request,
    executionService,
  }: {
    payload: ChatRequestBodyPayload | ChatCallbackRequestBodyPayload;
    request: KibanaRequest;
    executionService: AgentExecutionService;
  }) => {
    const {
      agent_id: agentId,
      conversation_id: conversationId,
      execution_id: executionId,
      input,
      prompts,
      attachments,
      access_control: accessControl,
      capabilities,
      browser_api_tools: browserApiTools,
      configuration_overrides: configurationOverrides,
      action,
    } = payload;

    const connectorId = resolveConnectorIdFromPayload(payload);
    const { useTaskManager, source, callback } = resolveExecutionOptions(payload);

    return executionService.executeAgent({
      mode: AgentExecutionMode.conversation,
      request,
      executionId,
      useTaskManager,
      params: {
        agentId,
        connectorId,
        conversationId,
        autoCreateConversationWithId: true,
        accessControl,
        source,
        callback,
        capabilities,
        browserApiTools,
        configurationOverrides,
        action,
        nextInput: {
          message: input,
          prompts,
          attachments,
        },
      },
    });
  };

  router.versioned
    .post({
      path: `${publicApiPath}/converse`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send chat message',
      description:
        'Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response. To learn more about agent chat, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: conversePayloadSchema },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/chat_converse.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { execution: executionService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

        await validateConfigurationOverrides({ payload, request });
        validateAction(payload);

        const { events$: chatEvents$ } = await executeAgent({
          payload,
          request,
          executionService,
        });

        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        return response.ok<ChatResponse>({
          body: buildChatResponseFromEvents(events),
        });
      })
    );

  router.versioned
    .post({
      path: `${publicApiPath}/converse/async`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Send chat message (streaming)',
      description: converseAsyncDescription,
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { body: conversePayloadSchema },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/chat_converse_async.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const [, { cloud }] = await coreSetup.getStartServices();
        const { execution: executionService } = getInternalServices();
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

        await validateConfigurationOverrides({ payload, request });
        validateAction(payload);

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const { events$: chatEvents$ } = await executeAgent({
          payload,
          request,
          executionService,
        });

        return response.ok({
          headers: getSSEResponseHeaders(),
          body: observableIntoEventSourceStream(
            chatEvents$ as unknown as Observable<ServerSentEvent>,
            {
              signal: abortController.signal,
              flushThrottleMs: 100,
              flushMinBytes: cloud?.isCloudEnabled ? cloudProxyBufferSize : undefined,
              logger,
            }
          ),
        });
      })
    );

  router.versioned
    .post({
      path: `${internalApiPath}/converse/callback`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'internal',
      summary: 'Send chat message with callback delivery',
      options: {
        tags: ['oas-tag:agent builder'],
        availability: {
          since: '9.5.0',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: callbackConversePayloadSchema },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { execution: executionService, callbackDeliveryService } = getInternalServices();
        const payload = request.body as ChatCallbackRequestBodyPayload;

        try {
          callbackDeliveryService.validateCallbackUrl(payload.callback.url);
        } catch (error) {
          throw createBadRequestError(error instanceof Error ? error.message : String(error));
        }

        await validateConfigurationOverrides({ payload, request });
        validateAction(payload);

        const { executionId } = await executeAgent({
          payload,
          request,
          executionService,
        });

        return response.accepted<ChatCallbackAcceptedResponse>({
          body: {
            execution_id: executionId,
            status: ExecutionStatus.scheduled,
          },
        });
      })
    );
}
