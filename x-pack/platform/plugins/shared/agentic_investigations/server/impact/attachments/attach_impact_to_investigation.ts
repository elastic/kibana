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
import { ImpactNotFoundError } from '../services/errors';

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

  // create treats a soft-deleted record as a duplicate, and update refuses it.
  // The public client has no restore, so drop the tombstone and create again.
  if (existing.active === false) {
    await client.delete({
      conversationId: impact.conversationId,
      attachmentId: impact.id,
      permanent: true,
    });
    await create();
    return;
  }

  await client.update({
    conversationId: impact.conversationId,
    attachmentId: impact.id,
    data: impact,
  });
};

/**
 * Writes impact only after the caller is allowed to update the conversation,
 * then puts the by-reference attachment. A failed attachment write reverts the
 * index write so a later read cannot see entities the conversation does not carry.
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
  writeImpact: () => Promise<Impact>;
  revertImpact: (args: { written: Impact; previous?: Impact }) => Promise<void>;
}): Promise<Impact> => {
  await assertConversationOwner(conversations, conversationId);

  let previous: Impact | undefined;
  try {
    previous = await readImpact();
  } catch (error) {
    if (!(error instanceof ImpactNotFoundError)) {
      throw error;
    }
  }

  const impact = await writeImpact();
  try {
    await putImpactAttachment(attachments, impact);
  } catch (error) {
    await revertImpact({ written: impact, previous }).catch(() => undefined);
    throw error;
  }
  return impact;
};
