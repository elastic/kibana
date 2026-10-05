/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { User } from '../../../common/user';
import type { InvestigationTrace, TraceStep } from '../../../common/trace/trace';
import {
  type AttachedFromTool,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { traceAttachment } from '../attachments/trace_attachment_type';
import type { TraceDocument } from '../storage/trace_storage';

/** One trace document per space and conversation. */
export const traceDocumentId = (spaceId: string, conversationId: string): string =>
  traceAttachment.documentId(spaceId, conversationId);

/**
 * Owns the trace index. Each write is a full snapshot: the steps the agent sends replace the
 * stored ones, so a step it leaves out is gone.
 */
export class TraceService {
  constructor(
    private readonly deps: { documents: InvestigationAttachmentDocService<TraceDocument> }
  ) {}

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<TraceDocument> {
    return this.deps.documents;
  }

  /** Agent tool path: replaces the steps, then adds or updates the attachment in the run. */
  async setFromTool({
    context,
    conversationId,
    steps,
    decisionTree,
    user,
  }: {
    context: Pick<ToolHandlerContext, 'attachments' | 'request' | 'spaceId'>;
    conversationId: string;
    steps: TraceStep[];
    decisionTree?: string;
    user?: User;
  }): Promise<AttachedFromTool<TraceDocument>> {
    const { spaceId } = context;
    return traceAttachment.writeFromTool({
      service: this.deps.documents,
      id: traceDocumentId(spaceId, conversationId),
      spaceId,
      context,
      mutate: (existing) => {
        const now = new Date().toISOString();
        const createdBy = existing ? existing.createdBy : user;
        return {
          spaceId,
          conversationId,
          steps,
          ...(decisionTree !== undefined && { decisionTree }),
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
  ): Promise<InvestigationTrace | undefined> {
    return this.deps.documents.get(traceDocumentId(spaceId, conversationId), spaceId);
  }
}
