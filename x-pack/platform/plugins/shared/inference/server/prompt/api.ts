/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptOptions, PromptAPI } from '@kbn/inference-common';
import { getConnectorProvider, getConnectorFamily, getConnectorModel } from '@kbn/inference-common';
import { type ChatCompleteApiWithCallback } from '../chat_complete/callback_api';
import { promptToMessageOptions } from '../../common/prompt/prompt_to_message_options';

export function createPromptApi(opts: { callbackApi: ChatCompleteApiWithCallback }): PromptAPI;
export function createPromptApi({ callbackApi }: { callbackApi: ChatCompleteApiWithCallback }) {
  return (options: PromptOptions) => {
    const {
      connectorId,
      stream,
      abortSignal,
      prompt,
      input,
      prevMessages,
      retryConfiguration,
      maxRetries,
      ...rest
    } = options;
    return callbackApi(
      {
        connectorId,
        stream,
        abortSignal,
        maxRetries,
        retryConfiguration,
      },
      (executor) => {
        const connector = executor.getConnector();
        const family = getConnectorFamily(connector);
        const provider = getConnectorProvider(connector);
        const id = getConnectorModel(connector);

        const { match, options: nextOptions } = promptToMessageOptions(prompt, input, {
          family,
          provider,
          id,
        });

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
      }
    );
  };
}
