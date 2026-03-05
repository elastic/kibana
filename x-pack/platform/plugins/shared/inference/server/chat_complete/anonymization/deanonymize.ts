/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, Deanonymization, Anonymization } from '@kbn/inference-common';
import { isEmpty } from 'lodash';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

/**
 * Recursively walks a value and replaces all string leaves using the provided
 * replacement function, collecting deanonymization metadata from every leaf.
 */
function deanonymizeStructure(
  value: unknown,
  replaceFn: (s: string) => { output: string; deanonymizations: Deanonymization[] },
  collectedDeanonymizations: Deanonymization[]
): unknown {
  if (typeof value === 'string') {
    const { output, deanonymizations } = replaceFn(value);
    collectedDeanonymizations.push(...deanonymizations);
    return output;
  }
  if (Array.isArray(value)) {
    return value.map((item) => deanonymizeStructure(item, replaceFn, collectedDeanonymizations));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        deanonymizeStructure(v, replaceFn, collectedDeanonymizations),
      ])
    );
  }
  return value;
}

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
  const allDeanonymizations: Deanonymization[] = [];

  if (anonymized.content && typeof anonymized.content === 'string') {
    const { content, ...rest } = anonymized;

    const contentDeanonymization = replace(anonymized.content);
    allDeanonymizations.push(...contentDeanonymization.deanonymizations);

    const deanonymizedRest = !isEmpty(rest)
      ? (deanonymizeStructure(rest, replace, allDeanonymizations) as typeof rest)
      : undefined;

    return {
      message: {
        ...message,
        ...(deanonymizedRest ?? {}),
        content: contentDeanonymization.output,
      },
      deanonymizations: allDeanonymizations,
    };
  }

  const deanonymizedParts = deanonymizeStructure(
    anonymized,
    replace,
    allDeanonymizations
  ) as typeof anonymized;

  return {
    message: {
      ...message,
      ...deanonymizedParts,
    },
    deanonymizations: allDeanonymizations,
  };
}
