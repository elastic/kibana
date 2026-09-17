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
