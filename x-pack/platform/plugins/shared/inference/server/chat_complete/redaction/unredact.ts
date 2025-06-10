/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, RedactionEntity, Unredaction } from '@kbn/inference-common';
import { getRedactableMessageParts } from './get_redactable_message_parts';

export function unredact<TMessage extends Message>(
  message: TMessage,
  masksLookup: Record<string, RedactionEntity>
): { message: TMessage; unredactions: Unredaction[] } {
  const masks = Object.keys(masksLookup);

  function replace(content: string) {
    const unredactions: Unredaction[] = [];
    let next = '';

    for (let i = 0; i < content.length; i++) {
      const slice = content.slice(i);

      const foundMask = masks.find((mask) => slice.startsWith(mask));

      if (foundMask) {
        const entity = masksLookup[foundMask];
        const start = i;
        const end = start + entity.value.length;
        unredactions.push({
          start,
          end,
          entity,
        });
        next += entity.value;
        i = end;
        continue;
      }

      next += content.slice(i, i + 1);
    }

    return {
      unredactions,
      output: next,
    };
  }

  const redacted = getRedactableMessageParts(message);

  const contentUnredaction =
    'content' in redacted && redacted.content && typeof redacted.content === 'string'
      ? replace(redacted.content)
      : undefined;

  const unredaction = replace(JSON.stringify(redacted));

  return {
    message: {
      ...message,
      ...(JSON.parse(unredaction.output) as typeof redacted),
    },
    unredactions: contentUnredaction ? contentUnredaction.unredactions : [],
  };
}
