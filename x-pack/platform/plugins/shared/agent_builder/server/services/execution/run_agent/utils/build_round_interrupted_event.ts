/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RoundInput,
  RoundInterruptedEvent,
  RuntimeAgentConfigurationOverrides,
} from '@kbn/agent-builder-common';
import { ChatEventType } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server/runner';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { RunAttachmentEvents } from '../run_attachment_events';
import type { RunTracker } from '../run_tracker';
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
  modelProvider: ModelProvider;
  mainConnectorId: string;
  configurationOverrides?: RuntimeAgentConfigurationOverrides;
  attachmentStateManager: AttachmentStateManager;
  /** The run's attachment events; drained for the last time here. */
  runAttachmentEvents: RunAttachmentEvents;
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
  modelProvider,
  mainConnectorId,
  configurationOverrides,
  attachmentStateManager,
  runAttachmentEvents,
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

  runAttachmentEvents.drainRemaining();
  const attachmentEvents = runAttachmentEvents.list();
  const pendingRound = pendingTurn?.compatRound;
  const workspaceId = getWorkspaceId?.();
  const { compactionSummary } = tracker.latestState();

  return {
    type: ChatEventType.roundInterrupted,
    data: {
      round_id: roundId,
      started_at: startTime.toISOString(),
      input: processedInput,
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
