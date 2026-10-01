/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { User } from '../../../common/user';
import type { Hypothesis, InvestigationHypotheses } from '../../../common/hypotheses/hypotheses';
import {
  hashInvestigationAttachmentId,
  type AttachedFromTool,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { hypothesesAttachment } from '../attachments/hypotheses_attachment_type';
import type { HypothesesDocument } from '../storage/hypotheses_storage';

/** One hypotheses document per space and conversation. */
export const hypothesesDocumentId = (spaceId: string, conversationId: string): string =>
  hashInvestigationAttachmentId(spaceId, conversationId);

/**
 * Owns the hypotheses index. Each write is a full snapshot: the list the agent sends replaces
 * the stored one, so a hypothesis it leaves out is gone.
 */
export class HypothesesService {
  constructor(
    private readonly deps: { documents: InvestigationAttachmentDocService<HypothesesDocument> }
  ) {}

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<HypothesesDocument> {
    return this.deps.documents;
  }

  /** Agent tool path: replaces the hypotheses, then adds or updates the attachment in the run. */
  async setFromTool({
    context,
    conversationId,
    hypotheses,
    user,
  }: {
    context: Pick<ToolHandlerContext, 'attachments' | 'request' | 'spaceId'>;
    conversationId: string;
    hypotheses: Hypothesis[];
    user?: User;
  }): Promise<AttachedFromTool<HypothesesDocument>> {
    const { spaceId } = context;
    return hypothesesAttachment.writeFromTool({
      service: this.deps.documents,
      id: hypothesesDocumentId(spaceId, conversationId),
      spaceId,
      context,
      mutate: (existing) => {
        const now = new Date().toISOString();
        const createdBy = existing ? existing.createdBy : user;
        return {
          spaceId,
          conversationId,
          hypotheses,
          createdAt: existing?.createdAt ?? now,
          ...(createdBy && { createdBy }),
          updatedAt: now,
        };
      },
    });
  }

  async findByConversationId(
    conversationId: string,
    spaceId: string
  ): Promise<InvestigationHypotheses | undefined> {
    return this.deps.documents.get(hypothesesDocumentId(spaceId, conversationId), spaceId);
  }

  /** Bulk hydrate; conversations without hypotheses are omitted. */
  async listByConversationIds(
    conversationIds: string[],
    spaceId: string
  ): Promise<InvestigationHypotheses[]> {
    return this.deps.documents.listByConversationIds(conversationIds, spaceId);
  }
}
