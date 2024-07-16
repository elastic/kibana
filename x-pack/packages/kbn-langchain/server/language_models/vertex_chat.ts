/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsClient } from '@kbn/actions-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  ChatGoogleBase,
  ChatGoogleBaseInput,
  GoogleBaseLLMInput,
  ReadableJsonStream,
} from '@langchain/google-common';
import { Readable } from 'stream';

export type ChatGoogleInput = ChatGoogleBaseInput<{}>;

export class ActionsClientVertexChatModel extends ChatGoogleBase<{}> implements ChatGoogleInput {
  #actionsClient: PublicMethodsOf<ActionsClient>;
  #connectorId: string;
  streaming: boolean;
  model: string = '';
  temperature: number = 0;
  #maxTokens?: number;

  static lc_name() {
    return 'ChatVertexAI';
  }

  constructor({ actionsClient, connectorId, streaming, temperature, model }) {
    super({
      // ...fields,
      platformType: 'gcp',
    });

    this.#actionsClient = actionsClient;
    this.#connectorId = connectorId;
    this.model = model;
    this.temperature = temperature ?? 0;
    this.streaming = streaming;
  }

  override buildAbstractedClient(fields: GoogleBaseLLMInput<{}> | undefined) {
    return {
      request: async (props) => {
        // create a new connector request body with the assistant message:
        const requestBody = {
          actionId: 'my-gemini-ai' || this.#connectorId,
          params: {
            subAction: this.streaming ? 'invokeStream' : 'invokeAIRaw',
            subActionParams: {
              model: 'gemini-1.5-pro-preview-0409' || this.model,
              messages: props.data,
            },
          },
        };

        const actionResult = await this.#actionsClient.execute(requestBody);

        if (this.streaming) {
          return {
            data: new ReadableJsonStream(
              actionResult.data ? Readable.toWeb(actionResult.data) : null
            ),
          };
        }

        return actionResult;
      },
      getProjectId: () => Promise.resolve(''),
      clientType: '',
    };
  }
}
