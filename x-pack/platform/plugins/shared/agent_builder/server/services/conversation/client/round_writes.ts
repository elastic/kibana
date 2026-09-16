/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type {
  Conversation,
  ConversationRound,
  RoundInput,
  TimelineEvent,
} from '@kbn/agent-builder-common';
import { createAttachmentPermanentDeleteBlockedError } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentReferencedInRounds } from '../../attachments/attachment_guards';
import { isRoundDerivedEventId, parseExecutionId, roundToEvents } from './rounds_to_events';

/**
 * Places `round` into `rounds` keyed on `round.id`, not on position: appends when
 * absent, replaces in place when present (HITL resume keeps the pending id).
 * `replacesRoundId` drops the round superseded by a regenerate, which mints a new
 * id; the replacement is appended rather than taking the dropped round's slot, so
 * it still sorts after a round that landed concurrently.
 *
 * Idempotent, so a retried write cannot duplicate a round.
 */
export const upsertRound = (
  rounds: ConversationRound[],
  round: ConversationRound,
  replacesRoundId?: string
): ConversationRound[] => {
  const base =
    replacesRoundId && replacesRoundId !== round.id
      ? rounds.filter(({ id }) => id !== replacesRoundId)
      : rounds;

  return base.some(({ id }) => id === round.id)
    ? base.map((existing) => (existing.id === round.id ? round : existing))
    : [...base, round];
};

/** True when a round's stored timeline spans more than one execution (a HITL resume). */
const hasResumeExecution = (roundId: string, storedEvents: TimelineEvent[]): boolean =>
  storedEvents.some((event) => {
    const execution = event.execution_id ? parseExecutionId(event.execution_id) : undefined;
    return execution?.roundId === roundId && execution.index > 0;
  });

/**
 * Rebuilds round-derived events on a rounds-path write, preserving resumed executions and additive
 * events. Only attachment refs are refreshed: the folded message belongs to the resume, not the
 * original user message. Undefined refs mean no update; an empty array explicitly clears them.
 */
export const reconcileEvents = (merged: Conversation): TimelineEvent[] => {
  const stored = merged.events ?? [];
  const additive = stored.filter((event) => !isRoundDerivedEventId(event.id));

  const roundDerived: TimelineEvent[] = [];
  for (const round of merged.rounds) {
    const storedForRound = stored.filter(
      (event) => event.id.startsWith(`${round.id}::`) && isRoundDerivedEventId(event.id)
    );
    if (hasResumeExecution(round.id, storedForRound)) {
      const userMessageId = `${round.id}::user_message`;
      roundDerived.push(
        ...storedForRound.map((event) => {
          if (event.id !== userMessageId || !round.input.attachment_refs) {
            return event;
          }
          const data = event.data as RoundInput;
          return {
            ...event,
            data: { ...data, attachment_refs: round.input.attachment_refs },
          } as TimelineEvent;
        })
      );
    } else {
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
  return events;
};

/**
 * Composes the stored state for a round upsert that may also carry additive timeline events
 * (attachment lifecycle events produced at round-complete time).
 *
 * `updateConversation` treats an explicit `events` update as the *full* projection and skips its
 * own `reconcileEvents`, so whenever additive events are written the round-derived events for
 * every round — including the one being upserted — must be regenerated here in the same write.
 * Without this, a round that adds/updates/deletes an attachment would store the round but drop
 * its own `user_message` / `execution_started` / steps / terminal event from `conversation.events`.
 *
 * When no *new* additive events survive dedup, `events` is left undefined so the caller keeps the
 * rounds-only write shape and `updateConversation` reconciles as before.
 */
export const composeRoundUpsert = ({
  current,
  round,
  replacesRoundId,
  additiveEvents,
}: {
  current: Conversation;
  round: ConversationRound;
  replacesRoundId?: string;
  additiveEvents: TimelineEvent[];
}): { rounds: ConversationRound[]; events?: TimelineEvent[]; writtenEvents: TimelineEvent[] } => {
  const rounds = upsertRound(current.rounds, round, replacesRoundId);
  const currentEvents = current.events ?? [];
  const existingIds = new Set(currentEvents.map((event) => event.id));
  const writtenEvents = additiveEvents.filter((event) => !existingIds.has(event.id));
  if (writtenEvents.length === 0) {
    return { rounds, writtenEvents };
  }
  const events = reconcileEvents({
    ...current,
    rounds,
    events: [...currentEvents, ...writtenEvents],
  });
  return { rounds, events, writtenEvents };
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
