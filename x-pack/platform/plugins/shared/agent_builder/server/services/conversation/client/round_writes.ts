/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
 * Merges attachment lists by id, `latestAttachments` winning. Callers pass a list
 * derived from a stale snapshot, so preferring the fresh record keeps concurrent
 * changes while still picking up attachments the operation created.
 */
export const mergeAttachmentsById = (
  latestAttachments: VersionedAttachment[],
  snapshotAttachments: VersionedAttachment[]
): VersionedAttachment[] => {
  const merged = new Map<string, VersionedAttachment>();

  for (const attachment of snapshotAttachments) {
    merged.set(attachment.id, attachment);
  }

  for (const attachment of latestAttachments) {
    merged.set(attachment.id, attachment);
  }

  return Array.from(merged.values());
};
