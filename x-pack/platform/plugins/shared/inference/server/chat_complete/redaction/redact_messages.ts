/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RedactionConfiguration,
  RegExpRule,
  RedactionEntity,
  Redaction,
  RedactionOutput,
} from '@kbn/inference-common';
import { Message } from '@kbn/inference-common';
import { merge, partition } from 'lodash';
import objectHash from 'object-hash';
import { getRedactableMessageParts } from './get_redactable_message_parts';

async function redact(
  input: string,
  redactionConfiguration: RedactionConfiguration
): Promise<{ output: string; redactions: Redaction[] }> {
  const rules = redactionConfiguration.rules.filter((rule) => rule.enabled);

  const [regexRules, _nerRules] = partition(
    rules,
    (rule): rule is RegExpRule => rule.type === 'RegExp'
  );

  const entities: Array<{ rule: RegExpRule; entity: RedactionEntity }> = [];

  let output = input;

  regexRules.forEach((rule) => {
    const regex = new RegExp(rule.pattern);

    let match: RegExpMatchArray | null = null;
    while ((match = regex.exec(output))) {
      const value = match[0];

      const mask = objectHash({
        value,
        class_name: rule.class_name,
      });

      output = output.replace(match[0], mask);

      entities.push({
        entity: {
          value,
          class_name: rule.class_name,
          mask,
        },
        rule,
      });
    }
  });

  let index = 0;

  const redactions: Redaction[] = [];
  entities.forEach(({ entity, rule }) => {
    const start = output.indexOf(entity.mask, index);
    index = start + entity.mask.length;
    redactions.push({
      entity,
      rule: {
        type: rule.type,
      },
    });
  });

  return {
    output,
    redactions,
  };
}

export async function redactMessages({
  messages,
  redactionConfiguration,
}: {
  messages: Message[];
  redactionConfiguration: RedactionConfiguration;
}): Promise<RedactionOutput> {
  const toRedact = messages.map(getRedactableMessageParts);

  const { output, redactions } = await redact(JSON.stringify(toRedact), redactionConfiguration);

  const redacted = JSON.parse(output) as typeof toRedact;

  const redactedMessages = messages.map((message, index) => {
    return merge({}, message, redacted[index]);
  });

  return {
    messages: redactedMessages,
    redactions,
  };
}
