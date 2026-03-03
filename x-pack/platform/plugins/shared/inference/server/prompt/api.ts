/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createInferenceRequestError,
  isConnectorApiCall,
  isInferenceIdApiCall,
  type PromptOptions,
  type PromptAPI,
} from '@kbn/inference-common';
import type { ChatCompleteApiWithCallbackCallback, ChatCompleteApiWithCallback } from '../chat_complete/callback_api';
import { promptToMessageOptions } from '../../common/prompt/prompt_to_message_options';

export function createPromptApi(opts: { callbackApi: ChatCompleteApiWithCallback }): PromptAPI;
export function createPromptApi({ callbackApi }: { callbackApi: ChatCompleteApiWithCallback }) {
  return (options: PromptOptions) => {
    const {
      stream,
      abortSignal,
      prompt,
      input,
      prevMessages,
      retryConfiguration,
      maxRetries,
      ...rest
    } = options;

    const initBase = { stream, abortSignal, retryConfiguration, maxRetries };

    const callback: ChatCompleteApiWithCallbackCallback = ({ model }) => {
      const { match, options: nextOptions } = promptToMessageOptions(prompt, input, model ?? {});

      const template =
        'mustache' in match.template ? match.template.mustache.template : undefined;

      return {
        ...rest,
        ...nextOptions,
        messages: nextOptions.messages.concat(prevMessages ?? []),
        metadata: {
          ...rest.metadata,
          attributes: {
            ...rest.metadata?.attributes,
            'gen_ai.prompt.id': prompt.name,
            'gen_ai.prompt.template.template': template,
            'gen_ai.prompt.template.variables': JSON.stringify(input),
          },
        },
      };
    };

    if (isConnectorApiCall(options)) {
      return callbackApi({ ...initBase, connectorId: options.connectorId }, callback);
    }

    if (isInferenceIdApiCall(options)) {
      return callbackApi({ ...initBase, inferenceId: options.inferenceId }, callback);
    }

    throw createInferenceRequestError(
      'Either connectorId or inferenceId must be provided',
      400
    );
  };
}
