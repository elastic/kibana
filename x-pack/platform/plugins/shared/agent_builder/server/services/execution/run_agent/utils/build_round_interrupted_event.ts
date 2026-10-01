/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ConversationRound,
  ConversationRoundAuthor,
  RoundInput,
  RoundInterruptedEvent,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ExecutionConversationOrigin } from '@kbn/agent-builder-server/execution';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type {
  AttachmentChange,
  AttachmentStateManager,
} from '@kbn/agent-builder-server/attachments';
import { mergeAttachmentRefs } from '../../../conversation/client/migrate_attachments';
import type { RunTracker } from '../run_tracker';
import { buildAttachmentEvents } from './add_round_complete_event';
import { formatAttachmentsMetadata } from './attachment_presentation';
import type { PendingTurn } from './conversation_turn';
import { buildInterruptedRound } from './round_summary';

export interface BuildRoundInterruptedEventParams {
  /** The latest graph state the stream carried and the out-of-band tool events (see `RunTracker`). */
  tracker: RunTracker;
  /** The runner's round id (a resume keeps the pending round's id for persistence). */
  roundId: string;
  /** The turn being resumed, when this execution is a HITL resume. */
  pendingTurn: PendingTurn | undefined;
  startTime: Date;
  /** The processed round input, as `round_started` announced it. */
  processedInput: RoundInput;
  author?: ConversationRoundAuthor;
  origin?: ExecutionConversationOrigin;
  agentId: string;
  conversation: Conversation | undefined;
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  attachmentStateManager: AttachmentStateManager;
  /** Attachment changes caused by the incoming message (drained after `prepareConversation`). */
  chatInputChanges: AttachmentChange[];
  getWorkspaceId?: () => string | undefined;
  /** Injectable for tests; defaults to now. */
  endTime?: Date;
}

/**
 * What is known about a run when it errors or is cancelled: the steps completed so far, the
 * partial run summary, the processed input and the attachment state. Built with the same
 * expressions the success path uses for `round_complete` (`addRoundCompleteEvent`), so the
 * persisted projection of an interrupted execution matches that of a completed one.
 */
export const buildRoundInterruptedEvent = ({
  tracker,
  roundId,
  pendingTurn,
  startTime,
  processedInput,
  author,
  origin,
  agentId,
  conversation,
  modelProvider,
  mainConnectorId,
  configurationOverrides,
  attachmentStateManager,
  chatInputChanges,
  getWorkspaceId,
  endTime = new Date(),
}: BuildRoundInterruptedEventParams): RoundInterruptedEvent => {
  const { steps, summary } = buildInterruptedRound({
    tracker,
    startTime,
    endTime,
    modelProvider,
    mainConnectorId,
    configurationOverrides,
  });

  // Same input processing as `createRound`: refs accessed during the run merged in, then the
  // attachment context rendered for the refs the round ends up with.
  const accessedRefs = attachmentStateManager.getAccessedRefs();
  let input: RoundInput =
    accessedRefs.length > 0
      ? {
          ...processedInput,
          attachment_refs: mergeAttachmentRefs(processedInput.attachment_refs, accessedRefs),
        }
      : processedInput;
  if (input.attachment_refs && input.attachment_refs.length > 0) {
    const attachmentContext = formatAttachmentsMetadata(
      input.attachment_refs,
      attachmentStateManager
    );
    if (attachmentContext) {
      input = { ...input, attachment_context: attachmentContext };
    }
  }

  // Identity of the round the success path would have produced: a resume keeps the pending
  // round's id / author / origin, a fresh round gets the handler's.
  const pendingRound = pendingTurn?.compatRound;
  const identity: Pick<ConversationRound, 'id' | 'author' | 'origin'> = pendingRound
    ? { id: pendingRound.id, author: pendingRound.author, origin: pendingRound.origin }
    : {
        id: roundId,
        ...(author ? { author } : {}),
        ...(origin ? { origin: { type: origin.type } } : {}),
      };
  const attachmentEvents = buildAttachmentEvents({
    conversation,
    round: identity,
    chatInputChanges,
    executionChanges: attachmentStateManager.drainChanges(),
    agentId,
    createdAt: endTime.toISOString(),
  });
  const workspaceId = getWorkspaceId?.();
  const { compactionSummary } = tracker.latestState();

  return {
    type: ChatEventType.roundInterrupted,
    data: {
      round_id: roundId,
      started_at: startTime.toISOString(),
      input,
      steps,
      summary,
      attachments: attachmentStateManager.getAll(),
      ...(attachmentEvents.length > 0 ? { attachment_events: attachmentEvents } : {}),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
      ...(pendingRound ? { resumed: true } : {}),
      ...(compactionSummary ? { compaction_summary: compactionSummary } : {}),
    },
  };
};
