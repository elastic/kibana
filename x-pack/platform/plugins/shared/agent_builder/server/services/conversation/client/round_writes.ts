/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type {
  Conversation,
  ConversationEvent,
  ConversationRound,
  RoundInput,
} from '@kbn/agent-builder-common';
import {
  CONVERSATION_EVENT_ID_DELIMITER,
  TimelineEventType,
  createAttachmentPermanentDeleteBlockedError,
  lastExecutionTerminal,
  parseExecutionId,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentReferencedInRounds } from '../../attachments/attachment_guards';
import { isRoundDerivedEventId, roundToEvents } from './rounds_to_events';

/** True when a round's stored timeline spans more than one execution (a HITL resume). */
const hasResumeExecution = (roundId: string, storedEvents: ConversationEvent[]): boolean =>
  storedEvents.some((event) => {
    const execution = event.execution_id ? parseExecutionId(event.execution_id) : undefined;
    return execution?.roundId === roundId && execution.index > 0;
  });

/** The round id a round-derived event id belongs to (the part before the first delimiter). */
const roundIdOfDerivedEvent = (id: string): string => id.split(CONVERSATION_EVENT_ID_DELIMITER)[0];

/** Stored round-derived events grouped by round id, in order of first stored position. */
const storedRoundBlocks = (stored: ConversationEvent[]): Map<string, ConversationEvent[]> => {
  const blocks = new Map<string, ConversationEvent[]>();
  for (const event of stored) {
    if (!isRoundDerivedEventId(event.id)) {
      continue;
    }
    const roundId = roundIdOfDerivedEvent(event.id);
    const block = blocks.get(roundId);
    if (block) {
      block.push(event);
    } else {
      blocks.set(roundId, [event]);
    }
  }
  return blocks;
};

/**
 * The events of a round present in `rounds`: its stored events when the round spans a resume
 * execution (only the `user_message` attachment refs are refreshed — the folded message belongs
 * to the resume, not the original user message), else regenerated from the round.
 */
const eventsForKnownRound = (
  round: ConversationRound,
  storedForRound: ConversationEvent[],
  conversation: Conversation
): ConversationEvent[] => {
  if (!hasResumeExecution(round.id, storedForRound)) {
    return roundToEvents(round, conversation);
  }
  const userMessageId = `${round.id}${CONVERSATION_EVENT_ID_DELIMITER}user_message`;
  return storedForRound.map((event) => {
    if (event.id !== userMessageId || !round.input.attachment_refs) {
      return event;
    }
    const data = event.data as RoundInput;
    return {
      ...event,
      data: { ...data, attachment_refs: round.input.attachment_refs },
    };
  });
};

/**
 * Whether a stored block absent from the caller's `rounds` was removed on purpose. It was when
 * the caller could see the round: the stored document already materialised it in its `rounds`
 * (`storedRoundIds`), or its last execution ended with an outcome (`execution_terminated`, a
 * completed or paused round — always materialised). Blocks with no terminal (in progress) and
 * interrupted blocks the stored `rounds` do not know about (a document written before interrupted
 * executions folded into rounds) are carried through: the caller has never seen them.
 */
const isRemovableBlock = (
  roundId: string,
  block: ConversationEvent[],
  storedRoundIds: ReadonlySet<string>
): boolean =>
  storedRoundIds.has(roundId) ||
  lastExecutionTerminal(block)?.type === TimelineEventType.executionTerminated;

/**
 * Rebuilds round-derived events on a rounds-path write, preserving resumed executions, additive
 * events and stored round blocks the caller cannot have removed on purpose.
 *
 * Stored blocks are emitted at their stored position. A block whose round is in `rounds` follows
 * the per-round rule ({@link eventsForKnownRound}). A block whose round is *not* in `rounds` is
 * dropped only when {@link isRemovableBlock} — the caller's `rounds` is authoritative for the
 * rounds it could see (`storedRounds`, the document's rounds at write time) — and kept untouched
 * otherwise. Rounds with no stored block yet are appended in `rounds` order. Non-feedback additive
 * events are re-inserted by `created_at`. Feedback events are appended last in their stored order
 * so that `eventsToRounds` last-event-wins is immune to clock skew between Kibana nodes: if two
 * feedback events for the same round have out-of-order `created_at` timestamps (because they were
 * written on nodes with skewed clocks), the one that was appended later still wins.
 */
export const reconcileEvents = (
  merged: Conversation,
  storedRounds: ReadonlyArray<Pick<ConversationRound, 'id'>>
): ConversationEvent[] => {
  const stored = merged.events ?? [];
  const nonRoundDerived = stored.filter((event) => !isRoundDerivedEventId(event.id));
  const additive = nonRoundDerived.filter(
    (event) => event.type !== TimelineEventType.roundFeedback
  );
  const feedbackEvents = nonRoundDerived.filter(
    (event) => event.type === TimelineEventType.roundFeedback
  );
  const roundsById = new Map(merged.rounds.map((round) => [round.id, round]));
  const storedRoundIds = new Set(storedRounds.map((round) => round.id));

  const roundDerived: ConversationEvent[] = [];
  const blocks = storedRoundBlocks(stored);
  for (const [roundId, block] of blocks) {
    const round = roundsById.get(roundId);
    if (round) {
      roundDerived.push(...eventsForKnownRound(round, block, merged));
    } else if (!isRemovableBlock(roundId, block, storedRoundIds)) {
      roundDerived.push(...block);
    }
  }
  for (const round of merged.rounds) {
    if (!blocks.has(round.id)) {
      roundDerived.push(...roundToEvents(round, merged));
    }
  }

  const events = [...roundDerived];
  for (const event of additive) {
    const insertAt = events.findIndex((existing) => existing.created_at > event.created_at);
    if (insertAt === -1) {
      events.push(event);
    } else {
      events.splice(insertAt, 0, event);
    }
  }
  events.push(...feedbackEvents);
  return events;
};

/**
 * Reconciles the attachment list an operation produced against the stored one.
 * Producers carry the whole list, so `snapshot` — what they started from — is what
 * separates an entry they changed from one they merely carried along.
 *
 * Compared structurally, not by `current_version`: `description`, `hidden`,
 * `readonly` and soft deletes all mutate an attachment without bumping it.
 *
 * Entries in `snapshot` that `produced` no longer carries were permanently deleted by the
 * producer and are dropped. When `storedRounds` is supplied (the rounds of the document as it is
 * at write time, inside the OCC retry loop) a removal is rejected if any of those rounds still
 * references the attachment: the caller's eligibility check ran against a possibly stale read,
 * and a round may have referenced the attachment in the meantime.
 */
export const reconcileAttachments = ({
  snapshot,
  stored,
  produced,
  storedRounds,
}: {
  snapshot: VersionedAttachment[];
  stored: VersionedAttachment[];
  produced: VersionedAttachment[];
  storedRounds?: ConversationRound[];
}): VersionedAttachment[] => {
  const before = new Map(snapshot.map((attachment) => [attachment.id, attachment]));
  const producedIds = new Set(produced.map(({ id }) => id));
  const reconciled = new Map(stored.map((attachment) => [attachment.id, attachment]));

  // the producer started from it and no longer carries it: a permanent delete
  for (const id of before.keys()) {
    if (!producedIds.has(id)) {
      if (storedRounds && isAttachmentReferencedInRounds(id, storedRounds)) {
        throw createAttachmentPermanentDeleteBlockedError({
          attachmentId: id,
          reason: 'referenced_in_rounds',
        });
      }
      reconciled.delete(id);
    }
  }

  for (const attachment of produced) {
    // unequal means created or changed; untouched entries defer to `stored`
    if (!isEqual(before.get(attachment.id), attachment)) {
      reconciled.set(attachment.id, attachment);
    }
  }

  return Array.from(reconciled.values());
};
