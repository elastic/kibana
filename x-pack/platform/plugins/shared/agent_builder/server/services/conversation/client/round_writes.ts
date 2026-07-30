/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';

/**
 * Places `round` into `rounds`, keyed on `round.id` rather than on position.
 *
 * Appends when the id is absent, and replaces in place when it is already
 * present — which covers the HITL resume flow, where the resumed round keeps the
 * pending round's id. `replacesRoundId` handles the regenerate flow, where a new
 * id is minted and the superseded round has to be dropped.
 *
 * Idempotent, so a retried write cannot duplicate a round, and commutative with
 * a concurrent append of a different round.
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

  const index = base.findIndex(({ id }) => id === round.id);

  return index >= 0 ? [...base.slice(0, index), round, ...base.slice(index + 1)] : [...base, round];
};

/**
 * Merges two attachment lists by id, with `latestAttachments` winning.
 *
 * Callers pass a list derived from a snapshot read before a long-running
 * operation, so assigning it wholesale would revert any attachment changes that
 * landed in the meantime. Preferring the freshly-read record keeps those, while
 * still picking up attachments the operation created.
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
