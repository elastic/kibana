/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionChunkEvent, UnvalidatedToolCall } from '@kbn/inference-common';
import { generateFakeToolCallId } from '../../../common';

interface UnvalidatedMessage {
  content: string;
  refusal?: string;
  tool_calls: UnvalidatedToolCall[];
}

interface ToolCallEntry {
  call: UnvalidatedToolCall;
}

/**
 * Merges tool calls from chunks into a single array of tool calls.
 *
 * Merge logic:
 * - `toolCallId` and `function.name` appear in the first chunk and should be set once
 * - `function.arguments` is streamed across multiple chunks and should be accumulated
 * - When `toolCallId` is empty, it's a continuation chunk for the most recent tool call at that index
 * - A delta with no `toolCallId` and no id previously established for its index is handled as follows:
 *   - fully empty (no name, no arguments, e.g. GPT-OSS-120B via EIS): skipped, it carries no data
 *   - otherwise (e.g. Gemini-via-EIS emits a single delta with empty id/name and full args): the
 *     call is tracked under a per-index key that can't collide with a real id, so it still merges
 *     cleanly. If the first real id for that index arrives later, the call is re-keyed to it.
 *     A call that never receives an id is given a generated one, since consumers require it.
 * - Real `toolCallId`s, when present, still take precedence and disambiguate tool calls that
 *   share an index but have different ids.
 */
const mergeToolCalls = (chunks: ChatCompletionChunkEvent[]): UnvalidatedToolCall[] => {
  // Tool calls by identifier: the provider's toolCallId, or a per-index symbol while no id was seen.
  // Symbols can't equal a string id, so provider ids never collide with the fallback keys.
  const entriesByKey = new Map<string | symbol, ToolCallEntry>();
  // Entries in first-seen order, kept separately so re-keying an entry doesn't change the order
  const orderedEntries: ToolCallEntry[] = [];
  // Map to track which index corresponds to which toolCallId
  const indexToToolCallId = new Map<number, string>();
  // Map to track the fallback key of an id-less tool call at each index
  const indexToIdlessKey = new Map<number, symbol>();

  for (const chunk of chunks) {
    chunk.tool_calls?.forEach((toolCall) => {
      const { index, toolCallId, function: toolFunction } = toolCall;

      // Track toolCallId for continuation chunks
      if (toolCallId) {
        indexToToolCallId.set(index, toolCallId);

        // The first real id for an index claims the call previously accumulated without one
        const idlessKey = indexToIdlessKey.get(index);
        if (idlessKey) {
          indexToIdlessKey.delete(index);
          const idlessEntry = entriesByKey.get(idlessKey);
          if (idlessEntry && !entriesByKey.has(toolCallId)) {
            entriesByKey.delete(idlessKey);
            entriesByKey.set(toolCallId, idlessEntry);
          }
        }
      }

      const knownKey = toolCallId || indexToToolCallId.get(index);

      // An empty delta with no known id would otherwise become a phantom tool call with an empty name
      if (!knownKey && !toolFunction.name && !toolFunction.arguments) {
        return;
      }

      let key: string | symbol;
      if (knownKey) {
        key = knownKey;
      } else {
        key = indexToIdlessKey.get(index) ?? Symbol(`tool_call_index_${index}`);
        indexToIdlessKey.set(index, key);
      }

      const existingEntry = entriesByKey.get(key);
      const existingToolCall = existingEntry?.call;
      const updatedToolCall: UnvalidatedToolCall = {
        function: {
          name: toolFunction.name || existingToolCall?.function.name || '',
          arguments: (existingToolCall?.function.arguments || '') + toolFunction.arguments,
        },
        toolCallId: toolCallId || existingToolCall?.toolCallId || '',
      };

      if (existingEntry) {
        existingEntry.call = updatedToolCall;
      } else {
        const entry: ToolCallEntry = { call: updatedToolCall };
        entriesByKey.set(key, entry);
        orderedEntries.push(entry);
      }
    });
  }

  const usedToolCallIds = new Set(
    orderedEntries.map(({ call }) => call.toolCallId).filter((toolCallId) => toolCallId !== '')
  );

  return orderedEntries.map(({ call }) => {
    // Downstream consumers (e.g. Agent Builder) require every tool call to have an id
    let toolCallId = call.toolCallId;
    while (toolCallId === '') {
      const candidateId = generateFakeToolCallId();
      if (!usedToolCallIds.has(candidateId)) {
        toolCallId = candidateId;
        usedToolCallIds.add(candidateId);
      }
    }

    return {
      ...call,
      toolCallId,
      function: {
        ...call.function,
        arguments: call.function.arguments === '' ? '{}' : call.function.arguments,
      },
    };
  });
};

/**
 * Merges chunks into a message, concatenating the content and tool calls.
 */
export const mergeChunks = (chunks: ChatCompletionChunkEvent[]): UnvalidatedMessage => {
  const message = chunks.reduce<UnvalidatedMessage>(
    (prev, chunk) => {
      prev.content += chunk.content ?? '';
      // Refusal is only set on the terminating chunk in practice, so latest-wins is enough.
      if (chunk.refusal) {
        prev.refusal = chunk.refusal;
      }

      return prev;
    },
    { content: '', tool_calls: [] }
  );

  message.tool_calls = mergeToolCalls(chunks);

  return message;
};
