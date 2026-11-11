/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type {
  InvestigationAttachmentDocument,
  StoredInvestigationAttachment,
} from '../../common/investigation_attachments';
import type { WrittenInvestigationAttachment } from './attachment_doc_service';

/** What happened to the conversation attachment after the index write. */
export type ToolAttachmentOutcome = 'added' | 'updated' | 'removed_by_user';

export interface AttachedFromTool<TStored extends StoredInvestigationAttachment> {
  document: InvestigationAttachmentDocument<TStored>;
  attachment: ToolAttachmentOutcome;
}

/**
 * Agent tool path. Writes the index immediately, then adds or updates the by-reference
 * attachment through the run's attachment state manager, which Agent Builder persists when the
 * round ends. The index stays the source of truth if the round fails before that.
 *
 * The state manager's `add` silently replaces a record with the same id, so an existing record
 * is updated instead, and a record the user removed is left removed. With `hidden`, the attachment
 * is added hidden from the chat; an update sends only the data.
 */
export const attachFromTool = async <TStored extends StoredInvestigationAttachment>({
  type,
  context: { attachments, request },
  read,
  write,
  revert,
  describe,
  hidden = false,
}: {
  type: string;
  context: Pick<ToolHandlerContext, 'attachments' | 'request'>;
  read: () => Promise<InvestigationAttachmentDocument<TStored> | undefined>;
  write: () => Promise<WrittenInvestigationAttachment<TStored>>;
  revert: (written: WrittenInvestigationAttachment<TStored>) => Promise<void>;
  /** Attachment label, set when the attachment is first added. */
  describe?: (document: InvestigationAttachmentDocument<TStored>) => string;
  /** Adds the attachment hidden from the chat (pills, inline cards, timeline events). */
  hidden?: boolean;
}): Promise<AttachedFromTool<TStored>> => {
  const written = await write();
  // A concurrent writer may already have changed the document; attach what is stored now.
  const document = (await read()) ?? written.written;

  try {
    const record = attachments.getAttachmentRecord(document.id);
    if (!record) {
      const description = describe?.(document);
      await attachments.add(
        {
          id: document.id,
          type,
          origin: document.id,
          data: document,
          ...(description !== undefined && { description }),
          ...(hidden && { hidden: true }),
        },
        ATTACHMENT_REF_ACTOR.agent,
        undefined,
        { request }
      );
      return { document, attachment: 'added' };
    }
    if (record.active === false) {
      return { document, attachment: 'removed_by_user' };
    }
    await attachments.update(document.id, { data: document }, ATTACHMENT_REF_ACTOR.agent, {
      request,
    });
    return { document, attachment: 'updated' };
  } catch (error) {
    await revert(written).catch(() => undefined);
    throw error;
  }
};
