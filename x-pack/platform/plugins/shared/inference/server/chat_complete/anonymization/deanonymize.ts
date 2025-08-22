/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, Deanonymization, Anonymization } from '@kbn/inference-common';
import { isEmpty } from 'lodash';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

export function deanonymize<TMessage extends Message>(
  message: TMessage,
  anonymizations: Anonymization[]
): { message: TMessage; deanonymizations: Deanonymization[] } {
  function replace(content: string) {
    let next = content;
    const deanonymizations: Deanonymization[] = [];

    anonymizations.forEach(({ entity }) => {
      let index = next.indexOf(entity.mask);

      while (index !== -1) {
        const start = index;
        const end = start + entity.value.length;

        deanonymizations.push({ start, end, entity });

        // Replace the mask with the original value
        next = next.slice(0, start) + entity.value + next.slice(start + entity.mask.length);

        // Continue searching after the replaced value to avoid infinite loops
        index = next.indexOf(entity.mask, start + entity.value.length);
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
