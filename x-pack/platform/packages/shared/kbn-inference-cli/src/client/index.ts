/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  BoundChatCompleteAPI,
  BoundOutputAPI,
  BoundPromptAPI,
  UnboundOutputOptions,
} from '@kbn/inference-common';
import { ToolSchemaTypeObject } from '@kbn/inference-common/src/chat_complete/tool_schema';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { createOutputApi } from '@kbn/inference-plugin/common';
import { InferenceCliClientOptions } from './types';
import { createChatComplete } from './create_chat_complete';
import { createPrompt } from './create_prompt';
import { combineSignal } from './combine_signal';

export class InferenceCliClient {
  private readonly boundChatCompleteAPI: BoundChatCompleteAPI;
  private readonly boundOutputAPI: BoundOutputAPI;
  private readonly boundPromptAPI: BoundPromptAPI;

  constructor(private readonly options: InferenceCliClientOptions) {
    this.boundChatCompleteAPI = createChatComplete(options);

    this.boundPromptAPI = createPrompt(options);

    const outputAPI = createOutputApi(this.boundChatCompleteAPI);

    this.boundOutputAPI = <
      TId extends string,
      TOutputSchema extends ToolSchemaTypeObject | undefined,
      TStream extends boolean = false
    >(
      outputOptions: UnboundOutputOptions<TId, TOutputSchema, TStream>
    ) => {
      options.log.debug(`Running task ${outputOptions.id}`);
      return outputAPI({
        ...outputOptions,
        connectorId: options.connector.connectorId,
        abortSignal: combineSignal(options.signal, outputOptions.abortSignal),
      });
    };
  }

  chatComplete: BoundChatCompleteAPI = (options) => {
    return this.boundChatCompleteAPI(options);
  };

  output: BoundOutputAPI = (options) => {
    return this.boundOutputAPI(options);
  };

  prompt: BoundPromptAPI = (options) => {
    return this.boundPromptAPI(options);
  };

  getLangChainChatModel = (): InferenceChatModel => {
    return new InferenceChatModel({
      connector: this.options.connector,
      chatComplete: this.boundChatCompleteAPI,
      signal: this.options.signal,
    });
  };
}
