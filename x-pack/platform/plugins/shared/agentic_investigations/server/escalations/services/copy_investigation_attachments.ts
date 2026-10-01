/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConversationWithPermissions } from '@kbn/agent-builder-common';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type {
  AttachmentPublicClient,
  BulkCreateAttachmentInput,
} from '@kbn/agent-builder-server';
import { ESCALATION_ATTACHMENT_WRITE_ACCESS } from '../../../common/escalations/constants';

/**
 * Copies active, non-screen_context attachments from `investigation` to `escalation`.
 *
 * - Each copy gets a deterministic id `${investigation.id}:${attachment.id}` so copies from
 *   different investigations never collide, and repeating the call is idempotent (already-exists
 *   errors are silently skipped).
 * - Copies are point-in-time snapshots. Synchronisation after the source changes is out of scope.
 * - Copied attachments are written with `render_inline: true` so they appear as cards in the
 *   escalation timeline.
 * - A failure for any individual attachment is logged but never propagated — the escalation write
 *   already succeeded.
 *
 * @returns Counts of successfully copied and failed attachments.
 */
export const copyInvestigationAttachments = async ({
  attachmentsClient,
  escalation,
  investigation,
  logger,
}: {
  attachmentsClient: AttachmentPublicClient;
  escalation: ConversationWithPermissions;
  investigation: ConversationWithPermissions;
  logger: Logger;
}): Promise<{ copied: number; failed: number }> => {
  const source = (investigation.attachments ?? []).filter(
    (att) => att.active !== false && att.type !== 'screen_context'
  );

  if (source.length === 0) {
    return { copied: 0, failed: 0 };
  }

  const inputs: BulkCreateAttachmentInput[] = source.map((att) => ({
    // Namespace the id so copies from two investigations that happen to share an attachment id
    // are stored as separate documents and don't collide.
    id: `${investigation.id}:${att.id}`,
    type: att.type,
    data: getLatestVersion(att)?.data,
    // Carry the origin reference when present so the copied attachment stays by-reference
    // (the data is also included so the content is available immediately without re-resolving).
    ...(att.origin !== undefined && { origin: att.origin }),
    ...(att.description !== undefined && { description: att.description }),
    ...(att.hidden !== undefined && { hidden: att.hidden }),
  }));

  const { created, errors } = await attachmentsClient.bulkCreate({
    conversationId: escalation.id,
    attachments: inputs,
    access: ESCALATION_ATTACHMENT_WRITE_ACCESS,
    render_inline: true,
  });

  for (const error of errors) {
    // Already-exists errors are expected on idempotent retries — downgrade them to debug.
    const level = error.message.includes('already exists') ? 'debug' : 'warn';
    logger[level](
      `[escalations] Failed to copy attachment to escalation. escalationId=${escalation.id} investigationId=${investigation.id} attachmentId=${error.id ?? '(no id)'} type=${error.type} error=${error.message}`
    );
  }

  return { copied: created.length, failed: errors.length };
};
