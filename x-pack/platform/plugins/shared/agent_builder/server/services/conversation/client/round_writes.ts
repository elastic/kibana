/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

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

/**
 * Reconciles the attachment list an operation produced against the stored one.
 * Producers carry the whole list, so `snapshot` — what they started from — is what
 * separates an entry they changed from one they merely carried along.
 *
 * Compared structurally, not by `current_version`: `description`, `hidden`,
 * `readonly` and soft deletes all mutate an attachment without bumping it.
 */
export const reconcileAttachments = ({
  snapshot,
  stored,
  produced,
}: {
  snapshot: VersionedAttachment[];
  stored: VersionedAttachment[];
  produced: VersionedAttachment[];
}): VersionedAttachment[] => {
  const before = new Map(snapshot.map((attachment) => [attachment.id, attachment]));
  const reconciled = new Map(stored.map((attachment) => [attachment.id, attachment]));

  for (const attachment of produced) {
    // unequal means created or changed; untouched entries defer to `stored`
    if (!isEqual(before.get(attachment.id), attachment)) {
      reconciled.set(attachment.id, attachment);
    }
  }

  return Array.from(reconciled.values());
};
