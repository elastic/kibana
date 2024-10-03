/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatConnection,
  GoogleAbstractedClient,
  GoogleAIBaseLLMInput,
  GoogleLLMResponse,
  JsonStream,
} from '@langchain/google-common';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { EnhancedGenerateContentResponse } from '@google/generative-ai';
import { AsyncCaller } from '@langchain/core/utils/async_caller';
import { get } from 'lodash/fp';
import { Readable } from 'stream';
import { convertResponseBadFinishReasonToErrorMsg } from '../../utils/gemini';
// only implements non-streaming requests
// stream is handled by ActionsClientChatVertexAI.*_streamResponseChunks
export class ActionsClientChatConnection<Auth> extends ChatConnection<Auth> {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  #model?: string;
  temperature: number;
  caller: AsyncCaller;
  constructor(
    fields: GoogleAIBaseLLMInput<Auth>,
    caller: AsyncCaller,
    client: GoogleAbstractedClient,
    streaming: boolean,
    actionsClient: PublicMethodsOf<ActionsClient>,
    connectorId: string
  ) {
    super(fields, caller, client, streaming);
    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    this.caller = caller;
    this.#model = fields.model;
    this.temperature = fields.temperature ?? 0;
    // this.api.safeResponseToChatGeneration = ({
    //   data,
    // }: {
    //   data: EnhancedGenerateContentResponse;
    // }) => {
    //   const ch = convertResponseContentToChatGenerationChunk(data, {
    //     index: 0,
    //   });
    //   console.log('safeResponseToChatGeneration data', data);
    //   console.log('safeResponseToChatGeneration chunk', ch);
    //   return ch;
    // };
  }

  async _request(
    // TODO better types here
    data: {
      contents: unknown;
      tools: unknown[];
      systemInstruction?: { parts: [{ text: string }] };
    },
    options: { signal?: AbortSignal },
    requestHeaders = {}
  ) {
    const systemInstruction = data?.systemInstruction?.parts?.[0]?.text.length
      ? { systemInstruction: data?.systemInstruction?.parts?.[0]?.text }
      : {};
    return this.caller.callWithOptions({ signal: options?.signal }, async () => {
      try {
        if (this.streaming) {
          const requestBody = {
            actionId: this.connectorId,
            params: {
              subAction: 'invokeStream',
              subActionParams: {
                model: this.#model,
                messages: data?.contents,
                tools: data?.tools,
                temperature: this.temperature,
                ...systemInstruction,
              },
            },
          };
          const actionResult = await this.actionsClient.execute(requestBody);

          if (actionResult.status === 'error') {
            throw new Error(
              `ActionsClientChatVertexAI: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
            );
          }

          const readable = get('data', actionResult) as Readable;

          if (typeof readable?.read !== 'function') {
            throw new Error('Action result status is error: result is not streamable');
          }

          // const stream = Readable.toWeb(readable);
          // return {
          //   data: new ReadableJsonStream(stream),
          // };
          return {
            data: new NodeJsonStream(readable),
          };
        }
        const requestBody = {
          actionId: this.connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              model: this.#model,
              messages: data?.contents,
              tools: data?.tools,
              temperature: this.temperature,
              ...systemInstruction,
            },
          },
        };
        const actionResult = (await this.actionsClient.execute(requestBody)) as {
          status: string;
          data: EnhancedGenerateContentResponse;
          message?: string;
          serviceMessage?: string;
        };

        if (actionResult.status === 'error') {
          throw new Error(
            `ActionsClientChatVertexAI: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
          );
        }

        if (actionResult.data.candidates && actionResult.data.candidates.length > 0) {
          // handle bad finish reason
          const errorMessage = convertResponseBadFinishReasonToErrorMsg(actionResult.data);
          if (errorMessage != null) {
            throw new Error(errorMessage);
          }
        }
        return actionResult as unknown as GoogleLLMResponse;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        // TODO: Improve error handling
        if (e.message?.includes('400 Bad Request')) {
          e.status = 400;
        }
        throw e;
      }
    });
  }
}
class NodeJsonStream extends JsonStream {
  constructor(data: Readable) {
    super();
    const decoder = new TextDecoder('utf-8');
    // let index = 0;
    // let partialStreamChunk = '';
    // let parsedStreamChunk: EnhancedGenerateContentResponse | null = null;
    data.on('data', (d) => {
      const text = decoder.decode(d, { stream: true });
      console.log(`NodeJsonStream text`, text);
      this.appendBuffer(text);
      // const nextChunk = `${partialStreamChunk + text}`;
      //
      // try {
      //   parsedStreamChunk = JSON.parse(nextChunk.replaceAll('data: ', '').replaceAll('\r\n', ''));
      //   partialStreamChunk = '';
      // } catch (_) {
      //   partialStreamChunk += nextChunk;
      // }
      // if (parsedStreamChunk !== null && !parsedStreamChunk.candidates?.[0]?.finishReason) {
      //   const functionCalls = parsedStreamChunk?.candidates?.[0]?.content.parts[0].functionCall
      //     ? [parsedStreamChunk.candidates?.[0]?.content.parts[0].functionCall]
      //     : [];
      //   const response = {
      //     ...parsedStreamChunk,
      //     functionCalls: () => functionCalls,
      //   };
      //
      //   index++;
      //   console.log('appendBuffer parsedStreamChunk', JSON.stringify(parsedStreamChunk));
      //   console.log('appendBuffer response', JSON.stringify(response));
      //   console.log('appendBuffer functionCalls', JSON.stringify(functionCalls));
      //   console.log(
      //     'appendBuffer response.functionCalls',
      //     JSON.stringify(response.functionCalls())
      //   );
      //   this.appendBuffer(`data: ${JSON.stringify(response)}`);
      // } else if (parsedStreamChunk) {
      //   // handle bad finish reason
      //   const errorMessage = convertResponseBadFinishReasonToErrorMsg(parsedStreamChunk);
      //   if (errorMessage != null) {
      //     throw new Error(errorMessage);
      //   }
      // }
    });
    data.on('end', () => {
      const rest = decoder.decode();
      console.log('NodeJsonStream END', rest);
      // this.appendBuffer(rest);
      this.closeBuffer();
    });
    data.on('error', (ee) => {
      const rest = decoder.decode();
      console.log('NodeJsonStream error', { ee, rest });
    });
  }
}
