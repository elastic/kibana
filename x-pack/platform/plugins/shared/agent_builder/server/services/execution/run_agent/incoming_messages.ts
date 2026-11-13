/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DeliveredMessageStepData } from '@kbn/agent-builder-common';
import { analyzeDeliveries, pendingSteers } from '@kbn/agent-builder-common';
import type { ConversationClient } from '@kbn/agent-builder-server/agents';
import { STEERS_PER_CHECK_MAX } from './constants';

export interface IncomingMessages {
  /**
   * Claims every pending steer the conversation holds that this execution has not delivered yet,
   * for the loop to put in front of the model. Returns step data; the graph node wraps it.
   */
  drain(args: {
    cycle: number;
    lastToolCallGroupId?: string;
    /** The run had written its answer when it checked; the steps carry it as an interim answer. */
    afterAnswer?: boolean;
  }): Promise<DeliveredMessageStepData[]>;
}

/**
 * The loop's view of messages sent while it runs. The first call reads the conversation body
 * (no baseline exists: a steer may have landed between the lock write and the start read); later
 * calls probe the document version and read the body only when it changed.
 *
 * At-most-once per execution comes from the delivered set, not from the probe: a probe that fails
 * delays delivery to the next successful check and cannot lose a steer.
 */
export const createIncomingMessages = ({
  conversationClient,
  conversationId,
  executionId,
  runOwnerId,
  logger,
}: {
  conversationClient: Required<Pick<ConversationClient, 'getWithVersion' | 'peekVersion'>>;
  conversationId: string;
  /** The lock holder; a document held by another execution stops delivery for this run. */
  executionId: string;
  /** The actor id of the run owner, whose credentials the run reads with. */
  runOwnerId: string;
  logger: Logger;
}): IncomingMessages => {
  let lastSeenSeq: number | undefined;
  const deliveredThisExecution = new Set<string>();
  let stopped = false;

  const drain: IncomingMessages['drain'] = async ({ cycle, lastToolCallGroupId, afterAnswer }) => {
    if (stopped) {
      return [];
    }
    try {
      if (lastSeenSeq !== undefined) {
        const { seqNo } = await conversationClient.peekVersion(conversationId);
        if (seqNo === lastSeenSeq) {
          return [];
        }
      }
      const { conversation, seqNo } = await conversationClient.getWithVersion(conversationId);
      lastSeenSeq = seqNo;

      if (conversation.active_execution?.execution_id !== executionId) {
        // A stale-holder takeover: the other run owns the conversation's steers from here on.
        stopped = true;
        logger.debug(
          `[steer] execution ${executionId} no longer holds conversation ${conversationId}; delivery stopped`
        );
        return [];
      }

      const events = conversation.events ?? [];
      const deliveries = analyzeDeliveries(events);
      const candidates = pendingSteers(events, deliveries)
        .filter((event) => !deliveredThisExecution.has(event.id))
        .slice(0, STEERS_PER_CHECK_MAX);
      if (candidates.length === 0) {
        return [];
      }

      const deliveredAt = new Date().toISOString();
      const delivered = candidates.map((event): DeliveredMessageStepData => {
        deliveredThisExecution.add(event.id);
        return {
          event_id: event.id,
          author: event.actor,
          is_run_owner: event.actor.id === runOwnerId,
          message: event.data.message,
          delivered_at: deliveredAt,
          cycle,
          ...(lastToolCallGroupId ? { tool_call_group_id: lastToolCallGroupId } : {}),
          ...(afterAnswer ? { after_answer: true } : {}),
          redelivered: deliveries.unfinishedReads.get(event.id) ?? 0,
        };
      });
      logger.debug(
        `[steer] execution ${executionId} cycle ${cycle} delivered ${delivered
          .map((step) => step.event_id)
          .join(', ')} (seq ${seqNo})`
      );
      return delivered;
    } catch (error) {
      // A failed probe or read never fails the run; the next check evaluates the document again.
      logger.debug(`[steer] check failed for execution ${executionId}: ${error.message}`);
      return [];
    }
  };

  return { drain };
};
