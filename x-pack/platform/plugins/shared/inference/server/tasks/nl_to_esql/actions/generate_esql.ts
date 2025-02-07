/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, map, merge, of, switchMap } from 'rxjs';
import type { Logger } from '@kbn/logging';
import {
  ToolCall,
  ToolOptions,
  withoutTokenCountEvents,
  isChatCompletionMessageEvent,
  Message,
  MessageRole,
  OutputCompleteEvent,
  OutputEventType,
  FunctionCallingMode,
  ChatCompleteMetadata,
} from '@kbn/inference-common';
import { correctCommonEsqlMistakes, generateFakeToolCallId } from '../../../../common';
import { InferenceClient } from '../../..';
import { INLINE_ESQL_QUERY_REGEX } from '../../../../common/tasks/nl_to_esql/constants';
import { EsqlDocumentBase } from '../doc_base';
import { requestDocumentationSchema } from './shared';
import type { NlToEsqlTaskEvent } from '../types';

export const generateEsqlTask = <TToolOptions extends ToolOptions>({
  chatCompleteApi,
  connectorId,
  systemMessage,
  messages,
  toolOptions: { tools, toolChoice },
  docBase,
  functionCalling,
  logger,
  system,
  metadata,
}: {
  connectorId: string;
  systemMessage: string;
  messages: Message[];
  toolOptions: ToolOptions;
  chatCompleteApi: InferenceClient['chatComplete'];
  docBase: EsqlDocumentBase;
  functionCalling?: FunctionCallingMode;
  logger: Pick<Logger, 'debug'>;
  metadata?: ChatCompleteMetadata;
  system?: string;
}) => {
  return function askLlmToRespond({
    documentationRequest: { commands, functions },
  }: {
    documentationRequest: { commands?: string[]; functions?: string[] };
  }): Observable<NlToEsqlTaskEvent<TToolOptions>> {
    const keywords = [...(commands ?? []), ...(functions ?? [])];
    const requestedDocumentation = docBase.getDocumentation(keywords);
    const fakeRequestDocsToolCall = createFakeTooCall(commands, functions);

    return merge(
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
        metadata,
        stream: true,
        system: `${systemMessage}

          # Current task

          Your current task is to respond to the user's question. If there is a tool
          suitable for answering the user's question, use that tool, preferably
          with a natural language reply included.

          Format any ES|QL query as follows:
          \`\`\`esql
          <query>
          \`\`\`

          When generating ES|QL, it is VERY important that you only use commands and functions present in the
          requested documentation, and follow the syntax as described in the documentation and its examples.
          Assume that ONLY the set of capabilities described in the provided ES|QL documentation is valid, and
          do not try to guess parameters or syntax based on other query languages.

          If what the user is asking for is not technically achievable with ES|QL's capabilities, just inform
          the user. DO NOT invent capabilities not described in the documentation just to provide
          a positive answer to the user. E.g. Pagination is not supported by the language, do not try to invent
          workarounds based on other languages.

          When converting queries from one language to ES|QL, make sure that the functions are available
          and documented in ES|QL. E.g., for SPL's LEN, use LENGTH. For IF, use CASE.
          ${system ? `## Additional instructions\n\n${system}` : ''}`,
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
        toolChoice,
        tools: {
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
            const onlyToolCall =
              generateEvent.toolCalls.length === 1 ? generateEvent.toolCalls[0] : undefined;

            if (onlyToolCall?.function.name === 'request_documentation') {
              const args = onlyToolCall.function.arguments;

              return askLlmToRespond({
                documentationRequest: {
                  commands: args.commands,
                  functions: args.functions,
                },
              });
            }
          }

          return of(generateEvent);
        })
      )
    );
  };
};

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
