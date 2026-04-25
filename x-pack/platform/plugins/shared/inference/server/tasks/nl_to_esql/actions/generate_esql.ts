/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map, merge, of, switchMap } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  ToolCall,
  ToolOptions,
  Message,
  OutputCompleteEvent,
  ChatCompleteMetadata,
  ChatCompleteOptions,
  ChatCompleteAPI,
} from '@kbn/inference-common';
import {
  withoutTokenCountEvents,
  isChatCompletionMessageEvent,
  MessageRole,
  OutputEventType,
  ToolChoiceType,
} from '@kbn/inference-common';
import { correctCommonEsqlMistakes, generateFakeToolCallId } from '../../../../common';
import { INLINE_ESQL_QUERY_REGEX } from '../../../../common/tasks/nl_to_esql/constants';
import type { EsqlDocumentBase } from '../doc_base';
import { requestDocumentationSchema } from './shared';
import type { NlToEsqlTaskEvent } from '../types';
import { generateEsqlPrompt } from './prompts';

const MAX_CALLS = 8;

interface LlmEsqlTaskOptions {
  documentationRequest: { commands?: string[]; functions?: string[] };
  callCount?: number;
}

type LlmEsqlTask<TToolOptions extends ToolOptions = ToolOptions> = (
  options: LlmEsqlTaskOptions
) => Observable<NlToEsqlTaskEvent<TToolOptions>>;

interface GenerateEsqlTaskOptions
  extends Pick<ChatCompleteOptions, 'maxRetries' | 'retryConfiguration' | 'functionCalling'> {
  connectorId: string;
  messages: Message[];
  chatCompleteApi: ChatCompleteAPI;
  docBase: EsqlDocumentBase;
  logger: Pick<Logger, 'debug'>;
  metadata?: ChatCompleteMetadata;
  maxCallsAllowed?: number;
  additionalSystemInstructions?: string;
}

export function generateEsqlTask<TToolOptions extends ToolOptions>(
  options: GenerateEsqlTaskOptions & {
    toolOptions: TToolOptions;
  }
): LlmEsqlTask<TToolOptions>;

export function generateEsqlTask({
  chatCompleteApi,
  connectorId,
  additionalSystemInstructions,
  messages,
  toolOptions: { tools, toolChoice },
  docBase,
  functionCalling,
  maxRetries,
  retryConfiguration,
  logger,
  metadata,
  maxCallsAllowed = MAX_CALLS,
}: GenerateEsqlTaskOptions & {
  toolOptions: ToolOptions;
}): LlmEsqlTask {
  return function askLlmToRespond({
    documentationRequest: { commands, functions },
    callCount = 0,
  }: LlmEsqlTaskOptions): Observable<NlToEsqlTaskEvent<ToolOptions>> {
    const functionLimitReached = callCount >= maxCallsAllowed;
    const keywords = [...(commands ?? []), ...(functions ?? [])];
    const requestedDocumentation = docBase.getDocumentation(keywords);
    const fakeRequestDocsToolCall = createFakeTooCall(commands, functions);

    const availableTools = Object.keys(tools ?? {});

    const next$ = merge(
      of<
        OutputCompleteEvent<
          'request_documentation',
          { keywords: string[]; requestedDocumentation: Record<string, string> }
        >
      >({
        type: OutputEventType.OutputComplete,
        id: 'request_documentation',
        output: {
          keywords,
          requestedDocumentation,
        },
        content: '',
      }),
      chatCompleteApi({
        connectorId,
        functionCalling,
        maxRetries,
        retryConfiguration,
        metadata,
        stream: true,
        system: generateEsqlPrompt({
          esqlPrompts: docBase.getPrompts(),
          additionalSystemInstructions,
          availableTools,
          hasTools: !functionLimitReached && Object.keys(tools ?? {}).length > 0,
        }),
        messages: [
          ...messages,
          {
            role: MessageRole.Assistant,
            content: null,
            toolCalls: [fakeRequestDocsToolCall],
          },
          {
            name: fakeRequestDocsToolCall.function.name,
            role: MessageRole.Tool,
            response: {
              documentation: requestedDocumentation,
            },
            toolCallId: fakeRequestDocsToolCall.toolCallId,
          },
        ],
        toolChoice: !functionLimitReached ? toolChoice : ToolChoiceType.none,
        tools: functionLimitReached
          ? undefined
          : {
              ...tools,
              request_documentation: {
                description: 'Request additional ES|QL documentation if needed',
                schema: requestDocumentationSchema,
              },
            },
      }).pipe(
        withoutTokenCountEvents(),
        map((generateEvent) => {
          if (isChatCompletionMessageEvent(generateEvent)) {
            return {
              ...generateEvent,
              content: generateEvent.content
                ? correctEsqlMistakes({ content: generateEvent.content, logger })
                : generateEvent.content,
            };
          }

          return generateEvent;
        }),
        switchMap((generateEvent) => {
          if (isChatCompletionMessageEvent(generateEvent)) {
            const toolCalls = generateEvent.toolCalls;
            const onlyToolCall = toolCalls.length === 1 ? toolCalls[0] : undefined;

            if (onlyToolCall && onlyToolCall.function.name === 'request_documentation') {
              if (functionLimitReached) {
                return of({
                  ...generateEvent,
                  content: `You have reached the maximum number of documentation requests. Do not try to request documentation again for commands ${commands?.join(
                    ', '
                  )} and functions ${functions?.join(
                    ', '
                  )}. Try to answer the user's question using currently available information.`,
                });
              }

              const args =
                'arguments' in onlyToolCall.function ? onlyToolCall.function.arguments : undefined;
              if (args && (args.commands?.length || args.functions?.length)) {
                return askLlmToRespond({
                  documentationRequest: {
                    commands: args.commands ?? [],
                    functions: args.functions ?? [],
                  },
                  callCount: callCount + 1,
                });
              }
            }
          }

          return of(generateEvent);
        })
      )
    );

    return next$;
  };
}

const correctEsqlMistakes = ({
  content,
  logger,
}: {
  content: string;
  logger: Pick<Logger, 'debug'>;
}) => {
  return content.replaceAll(INLINE_ESQL_QUERY_REGEX, (_match, query) => {
    const correction = correctCommonEsqlMistakes(query);
    if (correction.isCorrection) {
      logger.debug(`Corrected query, from: \n${correction.input}\nto:\n${correction.output}`);
    }
    return '```esql\n' + correction.output + '\n```';
  });
};

const createFakeTooCall = (
  commands: string[] | undefined,
  functions: string[] | undefined
): ToolCall => {
  return {
    function: {
      name: 'request_documentation',
      arguments: {
        commands,
        functions,
      },
    },
    toolCallId: generateFakeToolCallId(),
  };
};
