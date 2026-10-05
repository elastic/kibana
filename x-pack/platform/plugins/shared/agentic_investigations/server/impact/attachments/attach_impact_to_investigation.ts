/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createConversationNotFoundError,
  isAttachmentAlreadyExistsError,
  isAttachmentNotFoundError,
} from '@kbn/agent-builder-common';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import type { WrittenAttach } from '../services/impact_service';

/** Two stamps can race; retry while a fresher document appears. */
const MAX_STAMP_ATTEMPTS = 3;

const sameImpact = (left: Impact, right: Impact): boolean =>
  left.id === right.id &&
  left.spaceId === right.spaceId &&
  left.conversationId === right.conversationId &&
  left.createdAt === right.createdAt &&
  JSON.stringify(left.createdBy ?? null) === JSON.stringify(right.createdBy ?? null) &&
  JSON.stringify(left.entities) === JSON.stringify(right.entities);

/**
 * Confirms the caller can write this conversation before any impact index write.
 * `update_access_control` is Agent Builder's owner-only permission, and a missing
 * or unreadable conversation fails closed as not found.
 */
const assertConversationOwner = async (
  conversations: ConversationPublicClient,
  conversationId: string
): Promise<void> => {
  const conversation = await conversations.get(conversationId);
  if (conversation.permissions.update_access_control !== true) {
    throw createConversationNotFoundError({ conversationId });
  }
};

const putImpactAttachment = async (
  client: AttachmentPublicClient,
  impact: Impact
): Promise<void> => {
  const create = () =>
    client.create({
      conversationId: impact.conversationId,
      id: impact.id,
      type: IMPACT_ATTACHMENT_TYPE,
      origin: impact.id,
      data: impact,
    });

  try {
    await create();
    return;
  } catch (error) {
    if (!isAttachmentAlreadyExistsError(error)) {
      throw error;
    }
  }

  let existing;
  try {
    existing = await client.get({
      conversationId: impact.conversationId,
      attachmentId: impact.id,
    });
  } catch (error) {
    if (!isAttachmentNotFoundError(error)) {
      throw error;
    }
    await create();
    return;
  }

  // The user removed this attachment. Leave the tombstone: permanent delete is
  // rejected once a round has read it, and recreating it would undo that removal.
  if (existing.active === false) {
    return;
  }

  await client.update({
    conversationId: impact.conversationId,
    attachmentId: impact.id,
    data: impact,
  });
};

/**
 * Stamps the impact document as it is now. A concurrent attach can merge more
 * entities and update the attachment first; writing this call's older snapshot
 * back would hide that merge.
 */
const stampCurrentImpact = async (
  client: AttachmentPublicClient,
  readImpact: () => Promise<Impact>
): Promise<Impact> => {
  let current = await readImpact();
  for (let attempt = 0; attempt < MAX_STAMP_ATTEMPTS; attempt++) {
    await putImpactAttachment(client, current);
    const after = await readImpact();
    if (sameImpact(current, after)) {
      return after;
    }
    current = after;
  }
  await putImpactAttachment(client, current);
  return current;
};

/**
 * Writes impact only after the caller is allowed to update the conversation,
 * then puts the by-reference attachment from a fresh read. A failed attachment
 * write restores the body the successful index overwrote, so a concurrent merge
 * this call built on is kept.
 */
export const attachImpactToInvestigation = async ({
  conversations,
  attachments,
  conversationId,
  readImpact,
  writeImpact,
  revertImpact,
}: {
  conversations: ConversationPublicClient;
  attachments: AttachmentPublicClient;
  conversationId: string;
  readImpact: () => Promise<Impact>;
  writeImpact: () => Promise<WrittenAttach>;
  revertImpact: (args: { written: Impact; previous?: Impact }) => Promise<void>;
}): Promise<Impact> => {
  await assertConversationOwner(conversations, conversationId);

  const { written, previous } = await writeImpact();
  try {
    return await stampCurrentImpact(attachments, readImpact);
  } catch (error) {
    await revertImpact({ written, previous }).catch(() => undefined);
    throw error;
  }
};
