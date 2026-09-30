/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Message, Deanonymization, Anonymization, ToolCall } from '@kbn/inference-common';
import { isEmpty } from 'lodash';
import { getAnonymizableMessageParts } from './get_anonymizable_message_parts';

/** Shape produced by `getAnonymizableMessageParts` for an assistant message's tool calls. */
interface AnonymizableToolCall {
  function: ToolCall['function'];
}

interface DeanonymizeMaskMatch {
  start: number;
  mask: string;
  entity: Anonymization['entity'];
}

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
    // Multiple anonymization entries can point at the same mask.
    // Scan each unique mask once so we don't duplicate matches/ranges.
    const entitiesByMask = new Map<string, Anonymization['entity']>();
    for (const { entity } of anonymizations) {
      if (!entitiesByMask.has(entity.mask)) {
        entitiesByMask.set(entity.mask, entity);
      }
    }

    const matches: DeanonymizeMaskMatch[] = [];
    // Collect mask occurrences from the original (immutable) content.
    // We compute ranges from rebuilt output later, so they are final-string offsets.
    for (const [mask, entity] of entitiesByMask) {
      let index = content.indexOf(mask);
      while (index !== -1) {
        matches.push({ start: index, mask, entity });
        index = content.indexOf(mask, index + mask.length);
      }
    }

    // Sort left-to-right for cursor-based reconstruction.
    matches.sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      // Resolve same-start overlaps by preferring the longer mask
      return b.mask.length - a.mask.length;
    });

    const deanonymizations: Deanonymization[] = [];
    let cursor = 0;
    let output = '';

    // Rebuild content in one pass from left to right.
    // This avoids offset drift caused by mutating and re-indexing the same string.
    for (const match of matches) {
      // Ignore overlaps that were made stale by a previous (earlier/longer) match.
      if (match.start < cursor) {
        continue;
      }

      // Copy unchanged span, append replacement, and capture final-output range.
      output += content.slice(cursor, match.start);
      const start = output.length;
      output += match.entity.value;
      const end = output.length;
      deanonymizations.push({ start, end, entity: match.entity });
      cursor = match.start + match.mask.length;
    }

    output += content.slice(cursor);

    return {
      deanonymizations,
      output,
    };
  }

  const anonymized = getAnonymizableMessageParts(message);
  const allDeanonymizations: Deanonymization[] = [];

  // `getAnonymizableMessageParts` deliberately omits `toolCallId` from what gets walked/
  // deanonymized above (it's a technical identifier, not PII — see that function's doc comment).
  // Spreading the stripped-down (function-only) result directly onto the message would silently
  // wipe every tool call's id, breaking tool-call reconstruction downstream. Restore each id from
  // the original message by index instead.
  const restoreToolCallIds = (
    deanonymizedToolCalls: AnonymizableToolCall[] | undefined
  ): ToolCall[] | undefined => {
    const originalToolCalls = (message as unknown as { toolCalls?: ToolCall[] }).toolCalls;
    if (!originalToolCalls || !deanonymizedToolCalls) {
      return originalToolCalls;
    }
    return originalToolCalls.map((toolCall, index) => ({
      ...toolCall,
      function: deanonymizedToolCalls[index]?.function ?? toolCall.function,
    }));
  };

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
        ...('toolCalls' in (deanonymizedRest ?? {})
          ? { toolCalls: restoreToolCallIds((deanonymizedRest as typeof anonymized).toolCalls) }
          : {}),
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
      ...('toolCalls' in deanonymizedParts
        ? { toolCalls: restoreToolCallIds(deanonymizedParts.toolCalls) }
        : {}),
    },
    deanonymizations: allDeanonymizations,
  };
}
