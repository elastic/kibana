/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/onechat-common';
import { isToolCallStep } from '@kbn/onechat-common';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * List of attachment tool IDs that should have their results cleaned.
 * These tools return full attachment content which can bloat the conversation history.
 */
const ATTACHMENT_TOOL_IDS = [
  platformCoreTools.attachmentRead,
  platformCoreTools.attachmentUpdate,
  platformCoreTools.attachmentAdd,
  platformCoreTools.attachmentDelete,
  platformCoreTools.attachmentList,
  platformCoreTools.attachmentDiff,
];

/**
 * Marker interface for cleaned result data.
 */
interface CleanedResultData {
  __cleaned__: true;
  summary: string;
}

/**
 * Cleans attachment tool call results from conversation history.
 * Replaces full attachment content with minimal summaries to save LLM context tokens.
 *
 * This is aggressive cleaning - all attachment tool results are replaced with
 * brief summaries that provide continuity without the full data.
 *
 * @param rounds - Array of processed conversation rounds
 * @returns New array with cleaned rounds (does not mutate original)
 */
export const cleanAttachmentToolCalls = (
  rounds: ProcessedConversationRound[]
): ProcessedConversationRound[] => {
  return rounds.map((round) => ({
    ...round,
    steps: round.steps.map((step) => {
      // Only clean tool call steps for attachment tools
      if (!isToolCallStep(step)) {
        return step;
      }

      if (!ATTACHMENT_TOOL_IDS.includes(step.tool_id)) {
        return step;
      }

      // Replace results with minimal summaries
      return {
        ...step,
        results: step.results.map((result) => ({
          tool_result_id: result.tool_result_id,
          type: result.type,
          data: createCleanedData(step.tool_id, result.data as Record<string, unknown>),
        })),
      };
    }),
  }));
};

/**
 * Creates cleaned result data for an attachment operation.
 * Returns a summary that maintains conversational context without full content.
 */
const createCleanedData = (
  toolId: string,
  originalData: Record<string, unknown>
): CleanedResultData => {
  return {
    __cleaned__: true,
    summary: getCleanedSummary(toolId, originalData),
  };
};

/**
 * Generates a human-readable summary for the attachment operation.
 */
const getCleanedSummary = (toolId: string, data: Record<string, unknown>): string => {
  switch (toolId) {
    case platformCoreTools.attachmentRead: {
      const attachmentId = data.attachment_id ?? data.id ?? 'unknown';
      const version = data.version ?? 'current';
      const type = data.type ?? 'unknown';
      return `Read ${type} attachment ${attachmentId} v${version}`;
    }

    case platformCoreTools.attachmentUpdate: {
      const attachmentId = data.attachment_id ?? data.id ?? 'unknown';
      const newVersion = data.new_version ?? 'new';
      return `Updated attachment ${attachmentId} to v${newVersion}`;
    }

    case platformCoreTools.attachmentAdd: {
      const attachmentId = data.attachment_id ?? data.id ?? 'unknown';
      const type = data.type ?? 'unknown';
      return `Added new ${type} attachment ${attachmentId}`;
    }

    case platformCoreTools.attachmentDelete: {
      const attachmentId = data.attachment_id ?? data.id ?? 'unknown';
      return `Deleted attachment ${attachmentId}`;
    }

    case platformCoreTools.attachmentList: {
      const count = data.count ?? 0;
      return `Listed ${count} attachments`;
    }

    case platformCoreTools.attachmentDiff: {
      const attachmentId = data.attachment_id ?? data.id ?? 'unknown';
      const changeType = data.change_type ?? 'changed';
      const summary = data.summary ?? '';
      return `Diff for ${attachmentId}: ${changeType}${summary ? ` - ${summary}` : ''}`;
    }

    default:
      return 'Attachment operation completed';
  }
};

/**
 * Checks if a result has been cleaned (has the __cleaned__ marker).
 */
export const isCleanedResult = (data: unknown): data is CleanedResultData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__cleaned__' in data &&
    (data as CleanedResultData).__cleaned__ === true
  );
};
