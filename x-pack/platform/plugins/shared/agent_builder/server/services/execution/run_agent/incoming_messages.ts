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
  /** Returns up to `STEERS_PER_CHECK_MAX` undelivered steers as step data. */
  drain(args: {
    cycle: number;
    lastToolCallGroupId?: string;
    /** The check ran after the answer; the preceding step is the interim answer. */
    afterAnswer?: boolean;
  }): Promise<DeliveredMessageStepData[]>;
}

/**
 * The first check reads the body, since a steer may have landed between the lock write and the
 * start read; later checks probe the version and read only on change. The delivered set, not the
 * probe, keeps each steer to one delivery per execution.
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
