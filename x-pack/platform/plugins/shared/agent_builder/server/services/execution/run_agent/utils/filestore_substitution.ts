/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import { ToolResultType, TimelineEventType, isSubstitutionStep } from '@kbn/agent-builder-common';
import { isExcludedFromFilestore } from '@kbn/agent-builder-common/tools';
import type { ToolResultStore } from '@kbn/agent-builder-server/runner';
import { getToolCallEntryAbsolutePath } from '../../runner/store/volumes/tool_results/utils';
import type { ResearchAgentAction } from '../actions';
import { isSubstitutionAction } from '../actions';
import type { ProcessedTimelineEvent } from './context_timeline';
import type { ToolCallResultTransformer } from './tool_summarization';

/** File references and results of filestore-excluded tools (e.g. `read_file`) are never substituted. */
export const isSubstitutionCandidate = ({
  toolId,
  result,
}: {
  toolId: string;
  result: ToolResult;
}): boolean => result.type !== ToolResultType.fileReference && !isExcludedFromFilestore(toolId);

/**
 * Every tool call marked as substituted, from persisted `SubstitutionStep`s and in-flight
 * `SubstitutionAction`s. Collected before rendering because a round-start step marks tool calls
 * of earlier rounds.
 */
export const collectSubstitutionMarks = ({
  timeline,
  actions,
}: {
  timeline: ProcessedTimelineEvent[];
  actions: ResearchAgentAction[];
}): Set<string> => {
  const marks = new Set<string>();
  for (const event of timeline) {
    if (event.type === TimelineEventType.executionStep && isSubstitutionStep(event.data.step)) {
      event.data.step.substituted_tool_call_ids.forEach((id) => marks.add(id));
    }
  }
  for (const action of actions) {
    if (isSubstitutionAction(action)) {
      action.substituted_tool_call_ids.forEach((id) => marks.add(id));
    }
  }
  return marks;
};

const toFileReference = (result: ToolResult, path: string): ToolResult => ({
  tool_result_id: result.tool_result_id,
  type: ToolResultType.fileReference,
  data: {
    filepath: getToolCallEntryAbsolutePath(path),
    comment:
      'The result has been stored in the virtual file system. You can access it using the read_file tool with the specified filepath.',
  },
});

export const substituteToolCallResults = async ({
  toolCall,
  resultStore,
  logger,
}: {
  toolCall: ToolCallWithResult;
  resultStore: ToolResultStore;
  logger: Logger;
}): Promise<ToolResult[]> => {
  return Promise.all(
    toolCall.results.map(async (result) => {
      if (!isSubstitutionCandidate({ toolId: toolCall.tool_id, result })) {
        return result;
      }
      const entry = await resultStore
        .getEntryByResultId(result.tool_result_id)
        .catch(() => undefined);
      if (!entry) {
        logger.warn(
          `Substituted result ${result.tool_result_id} has no filestore entry; rendering raw`
        );
        return result;
      }
      return toFileReference(result, entry.path);
    })
  );
};

export const createMarkedResultTransformer = ({
  marks,
  resultStore,
  base,
  logger,
}: {
  marks: Set<string>;
  resultStore: ToolResultStore;
  base: ToolCallResultTransformer;
  logger: Logger;
}): ToolCallResultTransformer => {
  return async (toolCall) => {
    const results = await base(toolCall);
    if (!marks.has(toolCall.tool_call_id)) {
      return results;
    }
    return substituteToolCallResults({ toolCall: { ...toolCall, results }, resultStore, logger });
  };
};

/** Tool calls with at least one eligible result whose filestore entry exceeds the threshold. */
export const selectSubstitutionCandidates = async ({
  toolCalls,
  resultStore,
  thresholdTokens,
  alreadyMarked,
}: {
  toolCalls: ToolCallWithResult[];
  resultStore: ToolResultStore;
  thresholdTokens: number;
  alreadyMarked: Set<string>;
}): Promise<string[]> => {
  const selected: string[] = [];
  for (const toolCall of toolCalls) {
    if (alreadyMarked.has(toolCall.tool_call_id)) {
      continue;
    }
    for (const result of toolCall.results) {
      if (!isSubstitutionCandidate({ toolId: toolCall.tool_id, result })) {
        continue;
      }
      const entry = await resultStore
        .getEntryByResultId(result.tool_result_id)
        .catch(() => undefined);
      if (entry && entry.metadata.token_count > thresholdTokens) {
        selected.push(toolCall.tool_call_id);
        break;
      }
    }
  }
  return selected;
};
