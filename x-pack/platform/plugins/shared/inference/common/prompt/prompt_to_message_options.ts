/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, Model, Prompt, PromptVersion } from '@kbn/inference-common';
import { ChatCompleteOptions } from '@kbn/inference-common';
import Mustache from 'mustache';

export function promptToMessageOptions(
  prompt: Prompt,
  input: unknown,
  model: Model
): {
  match: PromptVersion;
  options: Pick<
    ChatCompleteOptions,
    'messages' | 'system' | 'tools' | 'toolChoice' | 'temperature'
  >;
} {
  const bestMatch =
    prompt.versions.find((version) => {
      return (
        !version.models ||
        version.models.find((versionModel) => {
          return versionModel.family === model.family && versionModel.provider === model.provider;
        })
      );
    }) ?? prompt.versions[0];

  const { system, toolChoice, tools, temperature, template } = bestMatch;

  const validatedInput = prompt.input.parse(input);

  const messages =
    'chat' in template
      ? template.chat.messages
      : [
          {
            role: MessageRole.User as const,
            content: Mustache.render(template.mustache.template, validatedInput),
          },
        ];

  return {
    match: bestMatch,
    options: {
      messages,
      system,
      tools,
      toolChoice,
      temperature,
    },
  };
}
