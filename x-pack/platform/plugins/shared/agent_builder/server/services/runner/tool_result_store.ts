/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ToolResult,
  ToolCallWithResult,
  ToolResultType,
} from '@kbn/agent-builder-common';
import { isToolCallStep } from '@kbn/agent-builder-common';
import type {
  ToolResultStore,
  WritableToolResultStore,
  ToolResultWithMeta,
} from '@kbn/agent-builder-server/runner';
import type { FileEntry, MemoryVolume } from './fs_store';
import { StoreEntryType } from './fs_store';

/////

export interface ToolCallEntryMeta {
  tool_result_type: ToolResultType;
  tool_id: string;
  tool_call_id: string;
}

export type ToolCallFileEntry<TData extends object = object> = FileEntry<TData, ToolCallEntryMeta>;

export const getToolCallEntryPath = ({
  toolId,
  toolCallId,
  toolResultId,
}: {
  toolId: string;
  toolCallId: string;
  toolResultId: string;
}): string => {
  // TODO: sanitize tool id
  return `/tool_calls/${toolId}/${toolCallId}/${toolResultId}.json`;
};

export const createToolCallEntry = (result: ToolResultWithMeta): ToolCallFileEntry => {
  return {
    type: 'file',
    path: getToolCallEntryPath({
      toolId: result.tool_id,
      toolCallId: result.tool_call_id,
      toolResultId: result.tool_result_id,
    }),
    content: result.data,
    metadata: {
      type: StoreEntryType.toolResult,
      id: result.tool_result_id,
      content_length: 0, // TODO
      readonly: true,
      extra: {
        tool_result_type: result.tool_result_type,
        tool_call_id: result.tool_call_id,
        tool_id: result.tool_id,
      },
    },
  };
};

/////

const toolCallToResults = (toolCall: ToolCallWithResult): ToolResultWithMeta[] => {
  return toolCall.results.map((result) => ({
    tool_result_type: result.type,
    tool_result_id: result.tool_result_id,
    tool_call_id: toolCall.tool_call_id,
    tool_id: toolCall.tool_id,
    data: result.data,
  }));
};

export const extractConversationToolResults = (
  conversation: ConversationRound[]
): ToolResultWithMeta[] => {
  const results: ToolResultWithMeta[] = [];
  for (const round of conversation) {
    const toolCalls = round.steps.filter(isToolCallStep).flatMap(toolCallToResults);
    results.push(...toolCalls);
  }
  return results;
};

export const createResultStore = ({
  toolResultsVolume,
  conversation,
}: {
  toolResultsVolume: MemoryVolume;
  conversation?: Conversation;
}): WritableToolResultStore => {
  const toolResults = extractConversationToolResults(conversation?.rounds ?? []);
  const toolCallEntries = toolResults.map(createToolCallEntry);

  // Populate the volume with existing tool results from the conversation
  toolCallEntries.forEach((entry) => {
    toolResultsVolume.add(entry);
  });

  return new ToolResultStoreImpl(toolResults, toolResultsVolume);
};

class ToolResultStoreImpl implements WritableToolResultStore {
  private readonly results: Map<string, ToolCallFileEntry> = new Map();
  private readonly volume: MemoryVolume;

  constructor(results: ToolResultWithMeta[] | undefined, volume: MemoryVolume) {
    this.volume = volume;
    if (results) {
      this.results = new Map(results.map((result) => [result.tool_result_id, result]));
    }
  }

  add(result: ToolResultWithMeta): void {
    this.results.set(result.tool_result_id, result);
    // Also add to the volume for filesystem access
    const entry = createToolCallEntry(result);
    this.volume.add(entry);
  }

  delete(resultId: string): boolean {
    const result = this.results.get(resultId);
    if (result) {
      const entry = createToolCallEntry(result);
      this.volume.remove(entry.path);
    }
    return this.results.delete(resultId);
  }

  has(resultId: string): boolean {
    return this.results.has(resultId);
  }

  get(resultId: string): ToolResult {
    if (!this.results.has(resultId)) {
      throw new Error(`Result with id ${resultId} does not exist`);
    }
    return this.results.get(resultId)!;
  }

  asReadonly(): ToolResultStore {
    return {
      has: (resultId) => this.has(resultId),
      get: (resultId) => this.get(resultId),
    };
  }
}
