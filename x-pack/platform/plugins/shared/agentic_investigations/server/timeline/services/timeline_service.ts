/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { User } from '../../../common/user';
import type { InvestigationTimeline, TimelineEvent } from '../../../common/timeline/timeline';
import {
  type AttachedFromTool,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { timelineAttachment } from '../attachments/timeline_attachment_type';
import type { TimelineDocument } from '../storage/timeline_storage';

/** One timeline document per space and conversation. */
export const timelineDocumentId = (spaceId: string, conversationId: string): string =>
  timelineAttachment.documentId(spaceId, conversationId);

/**
 * Owns the timeline index. Each write is a full snapshot: the events the agent sends replace the
 * stored ones, so an event it leaves out is gone.
 */
export class TimelineService {
  constructor(
    private readonly deps: { documents: InvestigationAttachmentDocService<TimelineDocument> }
  ) {}

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<TimelineDocument> {
    return this.deps.documents;
  }

  /** Agent tool path: replaces the events, then adds or updates the attachment in the run. */
  async setFromTool({
    context,
    conversationId,
    events,
    user,
  }: {
    context: Pick<ToolHandlerContext, 'attachments' | 'request' | 'spaceId'>;
    conversationId: string;
    events: TimelineEvent[];
    user?: User;
  }): Promise<AttachedFromTool<TimelineDocument>> {
    const { spaceId } = context;
    return timelineAttachment.writeFromTool({
      service: this.deps.documents,
      id: timelineDocumentId(spaceId, conversationId),
      spaceId,
      context,
      mutate: (existing) => {
        const now = new Date().toISOString();
        const createdBy = existing ? existing.createdBy : user;
        return {
          spaceId,
          conversationId,
          events,
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
  ): Promise<InvestigationTimeline | undefined> {
    return this.deps.documents.get(timelineDocumentId(spaceId, conversationId), spaceId);
  }
}
