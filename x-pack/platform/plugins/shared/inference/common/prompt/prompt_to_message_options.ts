/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole, Model, Prompt, PromptVersion } from '@kbn/inference-common';
import { ChatCompleteOptions } from '@kbn/inference-common';
import { omitBy, orderBy } from 'lodash';
import Mustache from 'mustache';
import { format } from 'util';

enum MatchType {
  default = 0,
  modelFamily = 1,
  modelId = 2,
}

interface PromptToMessageOptionsResult {
  match: PromptVersion;
  options: Pick<
    ChatCompleteOptions,
    'messages' | 'system' | 'tools' | 'toolChoice' | 'temperature'
  >;
}

export function promptToMessageOptions(
  prompt: Prompt,
  input: unknown,
  model: Model
): PromptToMessageOptionsResult {
  const matches = prompt.versions.flatMap((version) => {
    if (!version.models) {
      return [{ version, match: MatchType.default }];
    }

    return version.models.flatMap((match) => {
      if (match.id) {
        return model.id?.includes(match.id) ? [{ version, match: MatchType.modelId }] : [];
      }
      return match.family === model.family ? [{ version, match: MatchType.modelFamily }] : [];
    });
  });

  const bestMatch = orderBy(matches, (match) => match.match, 'desc')[0].version;

  if (!bestMatch) {
    throw new Error(`No model match found for ${format(model)}`);
  }

  const { toolChoice, tools, temperature, template } = bestMatch;

  const validatedInput = prompt.input.parse(input);

  const messages =
    'chat' in template
      ? template.chat.messages
      : [
          {
            role: MessageRole.User as const,
            content:
              'mustache' in template
                ? Mustache.render(template.mustache.template, validatedInput)
                : template.static.content,
          },
        ];

  const system =
    !bestMatch.system || typeof bestMatch.system === 'string'
      ? bestMatch.system
      : Mustache.render(bestMatch.system.mustache.template, validatedInput);

  return {
    match: bestMatch,
    options: omitBy(
      {
        messages,
        system,
        tools,
        toolChoice,
        temperature,
      },
      (val) => val === undefined
    ) as PromptToMessageOptionsResult['options'],
  };
}
