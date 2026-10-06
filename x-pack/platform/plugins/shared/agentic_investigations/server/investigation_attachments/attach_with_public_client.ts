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
import type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from '../../common/investigation_attachments';
import type { WrittenInvestigationAttachment } from './attachment_doc_service';
import { sameInvestigationAttachmentDocument } from './same_document';

/** Two stamps can race; retry while a fresher document appears. */
const MAX_STAMP_ATTEMPTS = 3;

/**
 * Confirms the caller can write this conversation before any index write.
 * `update_access_control` is Agent Builder's owner-only permission, which the public attachment
 * client's writes need; a missing or unreadable conversation fails closed as not found.
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

const putAttachment = async <TStored extends StoredInvestigationAttachment>(
  client: AttachmentPublicClient,
  type: string,
  hidden: boolean,
  document: InvestigationAttachmentDocument<TStored>
): Promise<void> => {
  const create = () =>
    client.create({
      conversationId: document.conversationId,
      id: document.id,
      type,
      origin: document.id,
      data: document,
      ...(hidden && { hidden: true }),
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
      conversationId: document.conversationId,
      attachmentId: document.id,
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
    conversationId: document.conversationId,
    attachmentId: document.id,
    data: document,
  });
};

/**
 * Stamps the document as it is now. A concurrent write can change it and update the attachment
 * first; writing this call's older snapshot back would hide that change.
 */
const stampCurrentDocument = async <TStored extends StoredInvestigationAttachment>(
  client: AttachmentPublicClient,
  type: string,
  hidden: boolean,
  read: () => Promise<InvestigationAttachmentDocument<TStored>>
): Promise<InvestigationAttachmentDocument<TStored>> => {
  let current = await read();
  for (let attempt = 0; attempt < MAX_STAMP_ATTEMPTS; attempt++) {
    await putAttachment(client, type, hidden, current);
    const after = await read();
    if (current.id === after.id && sameInvestigationAttachmentDocument(current, after)) {
      return after;
    }
    current = after;
  }
  await putAttachment(client, type, hidden, current);
  return current;
};

/**
 * Route and workflow step path. Writes the index only after the caller may update the
 * conversation, then puts the by-reference attachment from a fresh read through the public
 * attachment client. A soft-deleted attachment is left alone. A failed attachment write restores
 * the body the index write overwrote, so a concurrent change this call built on is kept.
 */
export const attachWithPublicClient = async <TStored extends StoredInvestigationAttachment>({
  type,
  conversations,
  attachments,
  conversationId,
  read,
  write,
  revert,
  hidden = false,
}: {
  type: string;
  conversations: ConversationPublicClient;
  attachments: AttachmentPublicClient;
  conversationId: string;
  read: () => Promise<InvestigationAttachmentDocument<TStored>>;
  write: () => Promise<WrittenInvestigationAttachment<TStored>>;
  revert: (written: WrittenInvestigationAttachment<TStored>) => Promise<void>;
  /** Creates the attachment hidden from the chat (pills, inline cards, timeline events). */
  hidden?: boolean;
}): Promise<InvestigationAttachmentDocument<TStored>> => {
  await assertConversationOwner(conversations, conversationId);

  const written = await write();
  try {
    return await stampCurrentDocument(attachments, type, hidden, read);
  } catch (error) {
    await revert(written).catch(() => undefined);
    throw error;
  }
};
