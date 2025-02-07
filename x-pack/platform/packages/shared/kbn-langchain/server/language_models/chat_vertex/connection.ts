/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatConnection,
  GeminiContent,
  GoogleAbstractedClient,
  GoogleAIBaseLLMInput,
  GoogleLLMResponse,
} from '@langchain/google-common';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { EnhancedGenerateContentResponse } from '@google/generative-ai';
import { AsyncCaller } from '@langchain/core/utils/async_caller';
import type { TelemetryMetadata } from '@kbn/actions-plugin/server/lib';
import { convertResponseBadFinishReasonToErrorMsg } from '../../utils/gemini';

// only implements non-streaming requests
// stream is handled by ActionsClientChatVertexAI.*_streamResponseChunks
export class ActionsClientChatConnection<Auth> extends ChatConnection<Auth> {
  actionsClient: PublicMethodsOf<ActionsClient>;
  connectorId: string;
  #model?: string;
  temperature: number;
  caller: AsyncCaller;
  telemetryMetadata?: TelemetryMetadata;
  constructor(
    fields: GoogleAIBaseLLMInput<Auth>,
    caller: AsyncCaller,
    client: GoogleAbstractedClient,
    _streaming: boolean, // defaulting to false in the super
    actionsClient: PublicMethodsOf<ActionsClient>,
    connectorId: string,
    telemetryMetadata?: TelemetryMetadata
  ) {
    super(fields, caller, client, false);
    this.actionsClient = actionsClient;
    this.connectorId = connectorId;
    this.telemetryMetadata = telemetryMetadata;
    this.caller = caller;
    this.#model = fields.model;
    this.temperature = fields.temperature ?? 0;
    const nativeFormatData = this.formatData.bind(this);
    this.formatData = async (data, options) => {
      const result = await nativeFormatData(data, options);
      if (result?.contents != null && result?.contents.length) {
        // ensure there are not 2 messages in a row from the same role,
        // if there are combine them
        result.contents = result.contents.reduce((acc: GeminiContent[], currentEntry) => {
          if (currentEntry.role === acc[acc.length - 1]?.role) {
            acc[acc.length - 1].parts = acc[acc.length - 1].parts.concat(currentEntry.parts);
            return acc;
          }
          return [...acc, currentEntry];
        }, []);
      }
      return result;
    };
  }

  async _request(
    // TODO better types here
    data: {
      contents: unknown;
      tools: unknown[];
      systemInstruction?: { parts: [{ text: string }] };
    },
    options: { signal?: AbortSignal }
  ) {
    const systemInstruction = data?.systemInstruction?.parts?.[0]?.text.length
      ? { systemInstruction: data?.systemInstruction?.parts?.[0]?.text }
      : {};
    return this.caller.callWithOptions({ signal: options?.signal }, async () => {
      try {
        const requestBody = {
          actionId: this.connectorId,
          params: {
            subAction: 'invokeAIRaw',
            subActionParams: {
              telemetryMetadata: this.telemetryMetadata,
              model: this.#model,
              messages: data?.contents,
              tools: data?.tools,
              temperature: this.temperature,
              ...systemInstruction,
              signal: options?.signal,
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
          const error = new Error(
            `ActionsClientChatVertexAI: action result status is error: ${actionResult?.message} - ${actionResult?.serviceMessage}`
          );
          if (actionResult?.serviceMessage) {
            error.name = actionResult?.serviceMessage;
          }
          throw error;
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
