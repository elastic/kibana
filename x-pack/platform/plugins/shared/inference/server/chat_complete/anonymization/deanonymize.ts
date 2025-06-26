/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, AnonymizationEntity, Deanonymization } from '@kbn/inference-common';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

export function deanonymize<TMessage extends Message>(
  message: TMessage,
  masksLookup: Record<string, AnonymizationEntity>
): { message: TMessage; unredactions: Deanonymization[] } {
  const masks = Object.keys(masksLookup);

  function replace(content: string) {
    const unredactions: Deanonymization[] = [];
    let next = '';
    let outputPos = 0; // Track position in output text

    for (let i = 0; i < content.length; i++) {
      const slice = content.slice(i);

      const foundMask = masks.find((mask) => slice.startsWith(mask));

      if (foundMask) {
        const entity = masksLookup[foundMask];
        const start = outputPos;
        const end = start + entity.value.length;

        unredactions.push({
          start,
          end,
          entity,
        });
        next += entity.value;
        outputPos += entity.value.length;
        i = i + foundMask.length - 1; // Advance by mask length, -1 because loop will increment
        continue;
      }

      next += content.slice(i, i + 1);
      outputPos++;
    }

    return {
      unredactions,
      output: next,
    };
  }

  const anonymized = getAnonymizableMessageParts(message);

  const contentDeanonymization =
    'content' in anonymized && anonymized.content && typeof anonymized.content === 'string'
      ? replace(anonymized.content)
      : undefined;

  const unredaction = replace(JSON.stringify(anonymized));

  return {
    message: {
      ...message,
      ...(JSON.parse(unredaction.output) as typeof anonymized),
    },
    unredactions: contentDeanonymization ? contentDeanonymization.unredactions : [],
  };
}
