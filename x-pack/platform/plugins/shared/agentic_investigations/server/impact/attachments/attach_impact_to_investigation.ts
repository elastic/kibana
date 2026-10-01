/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { IMPACT_ATTACHMENT_TYPE } from '../../../common/impact/attachment';
import type { Impact } from '../../../common/impact/impact';
import { attachWithPublicClient } from '../../investigation_attachments';
import type { WrittenAttach } from '../services/impact_service';

/**
 * Writes impact only after the caller is allowed to update the conversation,
 * then puts the by-reference attachment from a fresh read. A failed attachment
 * write restores the body the successful index overwrote, so a concurrent merge
 * this call built on is kept.
 */
export const attachImpactToInvestigation = ({
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
  revertImpact: (args: WrittenAttach) => Promise<void>;
}): Promise<Impact> =>
  attachWithPublicClient({
    type: IMPACT_ATTACHMENT_TYPE,
    conversations,
    attachments,
    conversationId,
    read: readImpact,
    write: writeImpact,
    revert: revertImpact,
  });
