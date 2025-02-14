/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/logging';
import { decode, encode } from 'gpt-tokenizer';
import { last, pick, take } from 'lodash';
import {
  catchError,
  concat,
  EMPTY,
  from,
  isObservable,
  Observable,
  of,
  OperatorFunction,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import { CONTEXT_FUNCTION_NAME } from '../../../functions/context';
import { createFunctionNotFoundError, Message, MessageRole } from '../../../../common';
import {
  createFunctionLimitExceededError,
  MessageOrChatEvent,
} from '../../../../common/conversation_complete';
import { FunctionVisibility } from '../../../../common/functions/types';
import { AdHocInstruction, Instruction } from '../../../../common/types';
import { createFunctionResponseMessage } from '../../../../common/utils/create_function_response_message';
import { emitWithConcatenatedMessage } from '../../../../common/utils/emit_with_concatenated_message';
import { withoutTokenCountEvents } from '../../../../common/utils/without_token_count_events';
import type { ChatFunctionClient } from '../../chat_function_client';
import type { AutoAbortedChatFunction } from '../../types';
import { createServerSideFunctionResponseError } from '../../util/create_server_side_function_response_error';
import { getSystemMessageFromInstructions } from '../../util/get_system_message_from_instructions';
import { replaceSystemMessage } from '../../util/replace_system_message';
import { LangTracer } from '../instrumentation/lang_tracer';
import { catchFunctionNotFoundError } from './catch_function_not_found_error';
import { extractMessages } from './extract_messages';
import { hideTokenCountEvents } from './hide_token_count_events';

const MAX_FUNCTION_RESPONSE_TOKEN_COUNT = 4000;

function executeFunctionAndCatchError({
  name,
  args,
  functionClient,
  messages,
  chat,
  signal,
  logger,
  tracer,
  connectorId,
  simulateFunctionCalling,
}: {
  name: string;
  args: string | undefined;
  functionClient: ChatFunctionClient;
  messages: Message[];
  chat: AutoAbortedChatFunction;
  signal: AbortSignal;
  logger: Logger;
  tracer: LangTracer;
  connectorId: string;
  simulateFunctionCalling: boolean;
}): Observable<MessageOrChatEvent> {
  // hide token count events from functions to prevent them from
  // having to deal with it as well

  return tracer.startActiveSpan(`execute_function ${name}`, ({ tracer: nextTracer }) =>
    hideTokenCountEvents((hide) => {
      const executeFunctionResponse$ = from(
        functionClient.executeFunction({
          name,
          chat: (operationName, params) => {
            return chat(operationName, {
              ...params,
              tracer: nextTracer,
              connectorId,
            }).pipe(hide());
          },
          args,
          signal,
          messages,
          connectorId,
          simulateFunctionCalling,
        })
      );

      return executeFunctionResponse$.pipe(
        catchError((error) => {
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
    })
  );
}

function getFunctionDefinitions({
  functionClient,
  functionLimitExceeded,
  disableFunctions,
}: {
  functionClient: ChatFunctionClient;
  functionLimitExceeded: boolean;
  disableFunctions:
    | boolean
    | {
        except: string[];
      };
}) {
  if (functionLimitExceeded || disableFunctions === true) {
    return [];
  }

  let systemFunctions = functionClient
    .getFunctions()
    .map((fn) => fn.definition)
    .filter(
      (def) =>
        !def.visibility ||
        [FunctionVisibility.AssistantOnly, FunctionVisibility.All].includes(def.visibility)
    );

  if (typeof disableFunctions === 'object') {
    systemFunctions = systemFunctions.filter((fn) => disableFunctions.except.includes(fn.name));
  }

  const actions = functionClient.getActions();

  const allDefinitions = systemFunctions
    .concat(actions)
    .map((definition) => pick(definition, 'name', 'description', 'parameters'));

  return allDefinitions;
}

export function continueConversation({
  messages: initialMessages,
  functionClient,
  chat,
  signal,
  functionCallsLeft,
  adHocInstructions = [],
  userInstructions,
  logger,
  disableFunctions,
  tracer,
  connectorId,
  simulateFunctionCalling,
}: {
  messages: Message[];
  functionClient: ChatFunctionClient;
  chat: AutoAbortedChatFunction;
  signal: AbortSignal;
  functionCallsLeft: number;
  adHocInstructions: AdHocInstruction[];
  userInstructions: Instruction[];
  logger: Logger;
  disableFunctions:
    | boolean
    | {
        except: string[];
      };
  tracer: LangTracer;
  connectorId: string;
  simulateFunctionCalling: boolean;
}): Observable<MessageOrChatEvent> {
  let nextFunctionCallsLeft = functionCallsLeft;

  const functionLimitExceeded = functionCallsLeft <= 0;

  const definitions = getFunctionDefinitions({
    functionLimitExceeded,
    functionClient,
    disableFunctions,
  });

  const registeredAdhocInstructions = functionClient.getAdhocInstructions();
  const allAdHocInstructions = adHocInstructions.concat(registeredAdhocInstructions);

  const messagesWithUpdatedSystemMessage = replaceSystemMessage(
    getSystemMessageFromInstructions({
      applicationInstructions: functionClient.getInstructions(),
      userInstructions,
      adHocInstructions: allAdHocInstructions,
      availableFunctionNames: definitions.map((def) => def.name),
    }),
    initialMessages
  );

  const lastMessage = last(messagesWithUpdatedSystemMessage)?.message;
  const isUserMessage = lastMessage?.role === MessageRole.User;

  return executeNextStep().pipe(handleEvents());

  function executeNextStep() {
    if (isUserMessage) {
      const operationName =
        lastMessage.name && lastMessage.name !== CONTEXT_FUNCTION_NAME
          ? `function_response ${lastMessage.name}`
          : 'user_message';

      return chat(operationName, {
        messages: messagesWithUpdatedSystemMessage,
        functions: definitions,
        tracer,
        connectorId,
        stream: true,
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
      messages: messagesWithUpdatedSystemMessage,
      signal,
      logger,
      tracer,
      connectorId,
      simulateFunctionCalling,
    });
  }

  function handleEvents(): OperatorFunction<MessageOrChatEvent, MessageOrChatEvent> {
    return (events$) => {
      const shared$ = events$.pipe(shareReplay());

      return concat(
        shared$,
        shared$.pipe(
          withoutTokenCountEvents(),
          extractMessages(),
          switchMap((extractedMessages) => {
            if (!extractedMessages.length) {
              return EMPTY;
            }
            return continueConversation({
              messages: messagesWithUpdatedSystemMessage.concat(extractedMessages),
              chat,
              functionCallsLeft: nextFunctionCallsLeft,
              functionClient,
              signal,
              userInstructions,
              adHocInstructions,
              logger,
              disableFunctions,
              tracer,
              connectorId,
              simulateFunctionCalling,
            });
          })
        )
      );
    };
  }
}
