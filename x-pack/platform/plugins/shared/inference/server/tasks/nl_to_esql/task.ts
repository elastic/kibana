/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import type { Observable } from 'rxjs';
import { from, switchMap } from 'rxjs';
import type { Message, ToolOptions } from '@kbn/inference-common';
import { MessageRole } from '@kbn/inference-common';
import { EsqlDocumentBase } from './doc_base';
import { requestDocumentation, generateEsqlTask } from './actions';
import type { NlToEsqlTaskParams, NlToEsqlTaskEvent } from './types';

const loadDocBase = once(() => EsqlDocumentBase.load());

export function naturalLanguageToEsql<TToolOptions extends ToolOptions>(
  options: NlToEsqlTaskParams<TToolOptions>
): Observable<NlToEsqlTaskEvent<TToolOptions>>;

export function naturalLanguageToEsql({
  client,
  connectorId,
  tools,
  toolChoice,
  logger,
  functionCalling,
  maxRetries,
  retryConfiguration,
  system,
  metadata,
  ...rest
}: NlToEsqlTaskParams<ToolOptions>): Observable<NlToEsqlTaskEvent<ToolOptions>> {
  return from(loadDocBase()).pipe(
    switchMap((docBase) => {
      const systemMessage = `You are a helpful assistant for generating and executing ES|QL queries.
Your goal is to help the user construct an ES|QL query for their data.
VERY IMPORTANT: When writing ES|QL queries, make sure to ONLY use commands, functions
and operators listed in the current documentation.
${docBase.getSystemMessage()}`;

      const messages: Message[] =
        'input' in rest ? [{ role: MessageRole.User, content: rest.input }] : rest.messages;

      const askLlmToRespond = generateEsqlTask({
        connectorId,
        chatCompleteApi: client.chatComplete,
        messages,
        docBase,
        logger,
        systemMessage,
        functionCalling,
        maxRetries,
        retryConfiguration,
        metadata,
        toolOptions: {
          tools,
          toolChoice,
        },
        system,
      });

      return requestDocumentation({
        connectorId,
        functionCalling,
        maxRetries,
        retryConfiguration,
        outputApi: client.output,
        messages,
        system: systemMessage,
        metadata,
        toolOptions: {
          tools,
          toolChoice,
        },
      }).pipe(
        switchMap((documentationEvent) => {
          return askLlmToRespond({
            documentationRequest: {
              commands: documentationEvent.output?.commands,
              functions: documentationEvent.output?.functions,
            },
          });
        })
      );
    })
  );
}
