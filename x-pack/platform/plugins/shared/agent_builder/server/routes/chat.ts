/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { Observable } from 'rxjs';
import { firstValueFrom, toArray } from 'rxjs';
import type { ServerSentEvent } from '@kbn/sse-utils';
import { observableIntoEventSourceStream, cloudProxyBufferSize } from '@kbn/sse-utils-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ConversationUpdatedEvent, ConversationCreatedEvent } from '@kbn/agent-builder-common';
import {
  agentBuilderDefaultAgentId,
  isRoundCompleteEvent,
  isConversationUpdatedEvent,
  isConversationCreatedEvent,
  createBadRequestError,
} from '@kbn/agent-builder-common';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { ChatRequestBodyPayload, ChatResponse } from '../../common/http_api/chat';
import { publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { AttachmentServiceStart } from '../services/attachments';
import type { AgentExecutionService } from '../services/execution';
import { validateToolSelection } from '../services/agents/persisted/client/utils';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';
import converseAsyncDescription from './oas/converse_async.text';

export function registerChatRoutes({
  router,
  getInternalServices,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  const conversePayloadSchema = schema.object({
    agent_id: schema.string({
      defaultValue: agentBuilderDefaultAgentId,
      meta: {
        description: 'The ID of the agent to chat with. Defaults to the default Elastic AI agent.',
      },
    }),
    connector_id: schema.maybe(
      schema.string({
        meta: {
          description: 'Optional connector ID for the agent to use for external integrations.',
        },
      })
    ),
    conversation_id: schema.maybe(
      schema.string({
        meta: {
          description: 'Optional existing conversation ID to continue a previous conversation.',
        },
      })
    ),
    input: schema.maybe(
      schema.string({
        meta: { description: 'The user input message to send to the agent.' },
      })
    ),
    prompts: schema.maybe(
      schema.recordOf(schema.string(), schema.object({ allow: schema.boolean() }), {
        meta: { description: 'Can be used to respond to a confirmation prompt.' },
      })
    ),
    attachments: schema.maybe(
      schema.arrayOf(
        schema.object({
          id: schema.maybe(
            schema.string({
              meta: { description: 'Optional id for the attachment.' },
            })
          ),
          type: schema.string({
            meta: { description: 'Type of the attachment.' },
          }),
          data: schema.recordOf(schema.string(), schema.any(), {
            meta: { description: 'Payload of the attachment.' },
          }),
          hidden: schema.maybe(
            schema.boolean({
              meta: { description: 'When true, the attachment will not be displayed in the UI.' },
            })
          ),
        }),
        {
          meta: {
            description:
              '**Technical Preview; added in 9.3.0.** Optional attachments to send with the message.',
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

  const validateAttachments = async ({
    attachments,
    attachmentsService,
  }: {
    attachments: AttachmentInput[];
    attachmentsService: AttachmentServiceStart;
  }) => {
    const results: AttachmentInput[] = [];
    for (const attachment of attachments) {
      const validation = await attachmentsService.validate(attachment);
      if (validation.valid) {
        results.push(validation.attachment);
      } else {
        throw createBadRequestError(`Attachment validation failed: ${validation.error}`);
      }
    }
    return results;
  };

  const validateAction = (payload: ChatRequestBodyPayload) => {
    if (payload.action === 'regenerate' && !payload.conversation_id) {
      throw createBadRequestError('conversation_id is required when action is regenerate');
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

  const executeAgent = async ({
    payload,
    attachments,
    request,
    abortSignal,
    executionService,
  }: {
    payload: Omit<ChatRequestBodyPayload, 'attachments'>;
    attachments: AttachmentInput[];
    request: KibanaRequest;
    abortSignal: AbortSignal;
    executionService: AgentExecutionService;
  }) => {
    const {
      agent_id: agentId,
      connector_id: connectorId,
      conversation_id: conversationId,
      input,
      prompts,
      capabilities,
      browser_api_tools: browserApiTools,
      configuration_overrides: configurationOverrides,
      action,
      _execution_mode: executionMode,
    } = payload;

    const useTaskManager =
      executionMode === 'task_manager' ? true : executionMode === 'local' ? false : undefined;

    const { events$ } = await executionService.executeAgent({
      request,
      abortSignal,
      useTaskManager,
      params: {
        agentId,
        connectorId,
        conversationId,
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

    return events$;
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
        'Send a message to an agent and receive a complete response. This synchronous endpoint waits for the agent to fully process your request before returning the final result. Use this for simple chat interactions where you need the complete response. To learn more, refer to the [agent chat documentation](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/chat).',
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
        const { execution: executionService, attachments: attachmentsService } =
          getInternalServices();
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

        const attachments = payload.attachments
          ? await validateAttachments({
              attachments: payload.attachments,
              attachmentsService,
            })
          : [];

        await validateConfigurationOverrides({ payload, request });
        validateAction(payload);

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const chatEvents$ = await executeAgent({
          payload,
          attachments,
          request,
          abortSignal: abortController.signal,
          executionService,
        });

        const events = await firstValueFrom(chatEvents$.pipe(toArray()));
        const {
          data: { round },
        } = events.find(isRoundCompleteEvent)!;
        const {
          data: { conversation_id: convId },
        } = events.find(
          (e): e is ConversationUpdatedEvent | ConversationCreatedEvent =>
            isConversationUpdatedEvent(e) || isConversationCreatedEvent(e)
        )!;
        return response.ok<ChatResponse>({
          body: {
            conversation_id: convId,
            round_id: round.id,
            ...omit(round, ['id', 'input', 'response', 'pending_prompt', 'state']),
            response: {
              ...round.response,
              prompt: round.pending_prompt,
            },
          },
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
        const { execution: executionService, attachments: attachmentsService } =
          getInternalServices();
        const payload: ChatRequestBodyPayload = request.body as ChatRequestBodyPayload;

        const attachments = payload.attachments
          ? await validateAttachments({
              attachments: payload.attachments,
              attachmentsService,
            })
          : [];

        await validateConfigurationOverrides({ payload, request });
        validateAction(payload);

        const abortController = new AbortController();
        request.events.aborted$.subscribe(() => {
          abortController.abort();
        });

        const chatEvents$ = await executeAgent({
          payload,
          attachments,
          request,
          abortSignal: abortController.signal,
          executionService,
        });

        return response.ok({
          headers: {
            // cloud compress text/* types, loosing chunking capabilities which we need for SSE
            'Content-Type': cloud?.isCloudEnabled
              ? 'application/octet-stream'
              : 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'Transfer-Encoding': 'chunked',
            'X-Content-Type-Options': 'nosniff',
            // This disables response buffering on proxy servers
            'X-Accel-Buffering': 'no',
          },
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
}
