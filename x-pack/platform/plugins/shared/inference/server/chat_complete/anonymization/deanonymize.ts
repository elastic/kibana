/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Message, Deanonymization, Anonymization } from '@kbn/inference-common';
import { isEmpty } from 'lodash';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

export function deanonymize<TMessage extends Message>(
  message: TMessage,
  anonymizations: Anonymization[]
): { message: TMessage; deanonymizations: Deanonymization[] } {
  // reverse order of anonymizations when unmasking, this ensures
  // doubly masked parts are unmasked appropriately. e.g.:
  // a => b => c should be unmasked as c => b => a. if you start
  // with a, you won't find a match, only c will be unmasked to b.
  const reversedAnonymizations = anonymizations.concat().reverse();

  function replace(content: string) {
    let next = content;
    const deanonymizations: Deanonymization[] = [];

    reversedAnonymizations.forEach(({ entity }) => {
      let index = next.indexOf(entity.mask);

      let offset = 0;

      while (index !== -1) {
        const start = index + offset;
        const end = start + entity.mask.length;

        deanonymizations.push({ start, end, entity });

        next = next.slice(0, start) + entity.value + next.slice(start + entity.mask.length);

        index = next.indexOf(entity.mask, end);

        offset += entity.value.length;
      }
    });

    return {
      deanonymizations,
      output: next,
    };
  }

  const anonymized = getAnonymizableMessageParts(message);

  if (anonymized.content && typeof anonymized.content === 'string') {
    const { content, ...rest } = anonymized;

    const contentDeanonymization = replace(anonymized.content);

    const unredaction = !isEmpty(rest) ? replace(JSON.stringify(rest)) : undefined;

    return {
      message: {
        ...message,
        ...(unredaction ? (JSON.parse(unredaction.output) as typeof anonymized) : {}),
        content: contentDeanonymization.output,
      },
      deanonymizations: contentDeanonymization.deanonymizations,
    };
  }

  const unredaction = replace(JSON.stringify(anonymized));

  return {
    message: {
      ...message,
      ...(JSON.parse(unredaction.output) as typeof anonymized),
    },
    deanonymizations: [],
  };
}
