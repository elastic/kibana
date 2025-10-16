/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { decode, encode } from 'gpt-tokenizer';
import { last, omit, pick, take } from 'lodash';
import type { Observable, OperatorFunction } from 'rxjs';
import {
  catchError,
  concat,
  EMPTY,
  from,
  isObservable,
  mergeMap,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { Connector } from '@kbn/actions-plugin/server';
import type { AssistantScope } from '@kbn/ai-assistant-common';
import { getInferenceConnectorInfo } from '../../../../common/utils/get_inference_connector';
import type { ToolCallEvent } from '../../../analytics/tool_call';
import { toolCallEventType } from '../../../analytics/tool_call';
import type {
  Message,
  CompatibleJSONSchema,
  MessageAddEvent,
  ConfirmationRequiredEvent,
} from '../../../../common';
import {
  CONTEXT_FUNCTION_NAME,
  createFunctionNotFoundError,
  MessageRole,
  StreamingChatResponseEventType,
} from '../../../../common';
import type { MessageOrChatEvent } from '../../../../common/conversation_complete';
import { createFunctionLimitExceededError } from '../../../../common/conversation_complete';
import type { Instruction } from '../../../../common/types';
import { createFunctionResponseMessage } from '../../../../common/utils/create_function_response_message';
import { emitWithConcatenatedMessage } from '../../../../common/utils/emit_with_concatenated_message';
import type { ChatFunctionClient } from '../../chat_function_client';
import type { AutoAbortedChatFunction } from '../../types';
import { createServerSideFunctionResponseError } from '../../util/create_server_side_function_response_error';
import { catchFunctionNotFoundError } from './catch_function_not_found_error';
import { extractMessages } from './extract_messages';

const MAX_FUNCTION_RESPONSE_TOKEN_COUNT = 4000;

const EXIT_LOOP_FUNCTION_NAME = 'exit_loop';

export function executeFunctionAndCatchError({
  name,
  args,
  functionClient,
  messages,
  chat,
  signal,
  logger,
  connectorId,
  simulateFunctionCalling,
  analytics,
  connector,
  scopes,
}: {
  name: string;
  args: string | undefined;
  functionClient: ChatFunctionClient;
  messages: Message[];
  chat: AutoAbortedChatFunction;
  signal: AbortSignal;
  logger: Logger;
  connectorId: string;
  simulateFunctionCalling: boolean;
  analytics: AnalyticsServiceStart;
  connector?: Connector;
  scopes: AssistantScope[];
}): Observable<MessageOrChatEvent> {
  return withExecuteToolSpan(name, { tool: { input: args } }, (span) => {
    // hide token count events from functions to prevent them from
    // having to deal with it as well

    const executeFunctionResponse$ = from(
      functionClient.executeFunction({
        name,
        chat: (operationName, params) => {
          return chat(operationName, {
            ...params,
            connectorId,
          });
        },
        args,
        signal,
        logger,
        messages,
        connectorId,
        simulateFunctionCalling,
      })
    );

    return executeFunctionResponse$.pipe(
      tap(() => {
        analytics.reportEvent<ToolCallEvent>(toolCallEventType, {
          toolName: name,
          connector: getInferenceConnectorInfo(connector),
          scopes,
        });
      }),
      catchError((error) => {
        span?.recordException(error);
        logger.error(`Encountered error running function ${name}: ${JSON.stringify(error)}`);
        // We want to catch the error only when a promise occurs
        // if it occurs in the Observable, we cannot easily recover
        // from it because the function may have already emitted
        // values which could lead to an invalid conversation state,
        // so in that case we let the stream fail.
        return of(createServerSideFunctionResponseError({ name, error }));
      }),
      switchMap((response) => {
        if (isObservable(response)) {
          return response;
        }

        // is messageAdd event
        if ('type' in response) {
          return of(response);
        }

        const encoded = encode(JSON.stringify(response.content || {}));

        const exceededTokenLimit = encoded.length >= MAX_FUNCTION_RESPONSE_TOKEN_COUNT;

        return of(
          createFunctionResponseMessage({
            name,
            content: exceededTokenLimit
              ? {
                  message:
                    'Function response exceeded the maximum length allowed and was truncated',
                  truncated: decode(take(encoded, MAX_FUNCTION_RESPONSE_TOKEN_COUNT)),
                }
              : response.content,
            data: response.data,
          })
        );
      })
    );
  });
}

function getFunctionOptions({
  functionClient,
  disableFunctions,
  functionLimitExceeded,
}: {
  functionClient: ChatFunctionClient;
  disableFunctions: boolean;
  functionLimitExceeded: boolean;
}): {
  functions?: Array<{ name: string; description: string; parameters?: CompatibleJSONSchema }>;
  functionCall?: string;
} {
  if (disableFunctions === true) {
    return {};
  }

  if (functionLimitExceeded) {
    return {
      functionCall: EXIT_LOOP_FUNCTION_NAME,
      functions: [
        {
          name: EXIT_LOOP_FUNCTION_NAME,
          description: `You've run out of tool calls. Call this tool, and explain to the user you've run out of budget.`,
          parameters: {
            type: 'object',
            properties: {
              response: {
                type: 'string',
                description: 'Your textual response',
              },
            },
            required: ['response'],
          },
        },
      ],
    };
  }

  const systemFunctions = functionClient
    .getFunctions()
    .map((fn) => fn.definition)
    .filter(({ isInternal }) => !isInternal);

  const actions = functionClient.getActions();

  const allDefinitions = systemFunctions
    .concat(actions)
    .map((definition) => pick(definition, 'name', 'description', 'parameters'));

  return { functions: allDefinitions };
}

export function continueConversation({
  messages: initialMessages,
  functionClient,
  chat,
  signal,
  functionCallsLeft,
  apiUserInstructions = [],
  kbUserInstructions,
  logger,
  disableFunctions,
  connectorId,
  simulateFunctionCalling,
  analytics,
  connector,
  scopes,
}: {
  messages: Message[];
  functionClient: ChatFunctionClient;
  chat: AutoAbortedChatFunction;
  signal: AbortSignal;
  functionCallsLeft: number;
  apiUserInstructions: Instruction[];
  kbUserInstructions: Instruction[];
  logger: Logger;
  disableFunctions: boolean;
  connectorId: string;
  simulateFunctionCalling: boolean;
  analytics: AnalyticsServiceStart;
  connector?: Connector;
  scopes: AssistantScope[];
}): Observable<MessageOrChatEvent> {
  let nextFunctionCallsLeft = functionCallsLeft;

  const functionLimitExceeded = functionCallsLeft <= 0;

  const functionOptions = getFunctionOptions({
    functionClient,
    disableFunctions,
    functionLimitExceeded,
  });

  const lastMessage = last(initialMessages)?.message;

  const isUserMessage = lastMessage?.role === MessageRole.User;

  // Filter out confirmation messages
  const messagesWithoutConfirmation = initialMessages.filter((msg) => {
    if (msg.message.role === MessageRole.User && msg.message.name) {
      try {
        const content = JSON.parse(msg.message.content || '{}');
        if (content.confirmed !== undefined) {
          return false; 
        }
      } catch (e) {
        // Not JSON, keep the message
      }
    }
    return true;
  });

  return executeNextStep().pipe(handleEvents());

  function executeNextStep() {
    // Check for confirmation/rejection messages (function responses with confirmation metadata)
    if (isUserMessage && lastMessage.name) {
      try {
        const content = JSON.parse(lastMessage.content || '{}');
        if (content.confirmed !== undefined) {
          // Find the original function_call in the conversation history
          // Use slice() to avoid mutating messagesWithoutConfirmation
          const functionCallMessage = messagesWithoutConfirmation
          .slice()
          .reverse()
          .find(
            (msg) =>
              msg.message.role === MessageRole.Assistant &&
              msg.message.function_call?.name === lastMessage.name
          );

          if (!functionCallMessage?.message.function_call) {
            return of(
              createServerSideFunctionResponseError({
                name: lastMessage.name,
                error: new Error('Could not find original function call in conversation history'),
              })
            );
          }

          const functionArgs = functionCallMessage.message.function_call.arguments;

          if (!content.confirmed) {
            // User cancelled
            return of(
              createServerSideFunctionResponseError({
                name: lastMessage.name,
                error: new Error('User cancelled operation'),
              })
            );
          }
          if (!functionClient.hasFunction(lastMessage.name)) {
            return of(
              createServerSideFunctionResponseError({
                name: lastMessage.name,
                error: new Error('Function not found'),
              })
            );
          }
          try {
            const parsedArgs = JSON.parse(functionArgs || '{}');
            functionClient.validate(lastMessage.name, parsedArgs);
          } catch (error) {
            return of(
              createServerSideFunctionResponseError({
                name: lastMessage.name,
                error,
              })
            );
          }
          // User confirmed - execute the function!
          return executeFunctionAndCatchError({
            name: lastMessage.name,
            args: functionArgs,
            chat,
            functionClient,
            messages: initialMessages.slice(0, -1), // Exclude the confirmation message
            signal,
            logger,
            connectorId,
            simulateFunctionCalling,
            analytics,
            connector,
            scopes,
          });
        }
      } catch (e) {
        // Not a confirmation message, fall through
      }
    }

    if (isUserMessage) {
      const operationName =
        lastMessage.name && lastMessage.name !== CONTEXT_FUNCTION_NAME
          ? `function_response ${lastMessage.name}`
          : 'user_message';

      return chat(operationName, {
        messages: messagesWithoutConfirmation,
        connectorId,
        stream: true,
        ...functionOptions,
      }).pipe(emitWithConcatenatedMessage(), catchFunctionNotFoundError(functionLimitExceeded));
    }

    const functionCallName = lastMessage?.function_call?.name;

    if (!functionCallName) {
      // reply from the LLM without a function request,
      // so we can close the stream and wait for input from the user
      return EMPTY;
    }

    // we know we are executing a function here, so we can already
    // subtract one, and reference the old count for if clauses
    const currentFunctionCallsLeft = nextFunctionCallsLeft;

    nextFunctionCallsLeft--;

    const isAction = functionCallName && functionClient.hasAction(functionCallName);
    const functionConfirmationRequiredConfig =
      functionCallName &&
      functionClient.getConfirmationConfig(functionCallName, lastMessage.function_call!.arguments);

    if (currentFunctionCallsLeft === 0) {
      // create a function call response error so the LLM knows it needs to stop calling functions
      return of(
        createServerSideFunctionResponseError({
          name: functionCallName,
          error: createFunctionLimitExceededError(),
        })
      );
    }

    if (currentFunctionCallsLeft < 0) {
      // LLM tried calling it anyway, throw an error
      return throwError(() => createFunctionLimitExceededError());
    }

    // if it's an action, we close the stream and wait for the action response
    // from the client/browser
    if (isAction) {
      try {
        functionClient.validate(
          functionCallName,
          JSON.parse(lastMessage.function_call!.arguments || '{}')
        );
      } catch (error) {
        // return a function response error for the LLM to handle
        return of(
          createServerSideFunctionResponseError({
            name: functionCallName,
            error,
          })
        );
      }

      return EMPTY;
    }

    if (functionConfirmationRequiredConfig) {
      return EMPTY;
    }

    if (!functionClient.hasFunction(functionCallName)) {
      // tell the LLM the function was not found
      return of(
        createServerSideFunctionResponseError({
          name: functionCallName,
          error: createFunctionNotFoundError(functionCallName),
        })
      );
    }

    return executeFunctionAndCatchError({
      name: functionCallName,
      args: lastMessage.function_call!.arguments,
      chat,
      functionClient,
      messages: messagesWithoutConfirmation,
      signal,
      logger,
      connectorId,
      simulateFunctionCalling,
      analytics,
      connector,
      scopes,
    });
  }

  function handleEvents(): OperatorFunction<MessageOrChatEvent, MessageOrChatEvent> {
    return (events$) => {
      const shared$ = events$.pipe(
        shareReplay(),
        mergeMap((event) => {
          if (event.type === StreamingChatResponseEventType.MessageAdd) {
            const message = event.message;
            const functionCallName = message.message.function_call?.name;

            if (functionCallName === EXIT_LOOP_FUNCTION_NAME) {
              const args = JSON.parse(message.message.function_call?.arguments ?? '{}') as {
                response: string;
              };

              return of({
                ...event,
                message: {
                  ...message,
                  message: {
                    ...omit(message.message, 'function_call', 'content'),
                    content: args.response ?? `The model returned an empty response`,
                  },
                },
              } satisfies MessageAddEvent);
            }

            if (functionCallName) {
              const confirmationConfig = functionClient.getConfirmationConfig(
                functionCallName,
                message.message.function_call?.arguments
              );

              if (confirmationConfig) {
                return from([
                  event, // Original message add event
                  {
                    type: StreamingChatResponseEventType.ConfirmationRequired,
                    functionName: functionCallName,
                    functionCallArguments: message.message.function_call?.arguments || '{}',
                    confirmationConfig,
                  } satisfies ConfirmationRequiredEvent,
                ]);
              }
            }
          }
          return of(event);
        })
      );

      return concat(
        shared$,
        shared$.pipe(
          extractMessages(),
          switchMap((extractedMessages) => {
            if (!extractedMessages.length) {
              return EMPTY;
            }
            return continueConversation({
              messages: messagesWithoutConfirmation.concat(extractedMessages),
              chat,
              functionCallsLeft: nextFunctionCallsLeft,
              functionClient,
              signal,
              kbUserInstructions,
              apiUserInstructions,
              logger,
              disableFunctions,
              connectorId,
              simulateFunctionCalling,
              analytics,
              connector,
              scopes,
            });
          })
        )
      );
    };
  }
}
