/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { User } from '../../../common/user';
import type { InvestigationComponentDiagram } from '../../../common/component_diagram/component_diagram';
import {
  type AttachedFromTool,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { componentDiagramAttachment } from '../attachments/component_diagram_attachment_type';
import type { ComponentDiagramDocument } from '../storage/component_diagram_storage';

/** What the agent sends: everything but the document bookkeeping. */
export type ComponentDiagramInput = Pick<
  InvestigationComponentDiagram,
  'title' | 'mermaid' | 'problemNodeIds' | 'description'
>;

/** One component diagram document per space and conversation. */
export const componentDiagramDocumentId = (spaceId: string, conversationId: string): string =>
  componentDiagramAttachment.documentId(spaceId, conversationId);

/**
 * Owns the component diagram index. Each write is a full snapshot: the diagram the agent sends
 * replaces the stored one, so a field it leaves out is gone.
 */
export class ComponentDiagramService {
  constructor(
    private readonly deps: {
      documents: InvestigationAttachmentDocService<ComponentDiagramDocument>;
    }
  ) {}

  /** The generic store, for the Agent Builder attachment type's resolve and staleness checks. */
  getDocumentService(): InvestigationAttachmentDocService<ComponentDiagramDocument> {
    return this.deps.documents;
  }

  /** Agent tool path: replaces the diagram, then adds or updates the attachment in the run. */
  async setFromTool({
    context,
    conversationId,
    diagram,
    user,
  }: {
    context: Pick<ToolHandlerContext, 'attachments' | 'request' | 'spaceId'>;
    conversationId: string;
    diagram: ComponentDiagramInput;
    user?: User;
  }): Promise<AttachedFromTool<ComponentDiagramDocument>> {
    const { spaceId } = context;
    return componentDiagramAttachment.writeFromTool({
      service: this.deps.documents,
      id: componentDiagramDocumentId(spaceId, conversationId),
      spaceId,
      context,
      mutate: (existing) => {
        const now = new Date().toISOString();
        const createdBy = existing ? existing.createdBy : user;
        return {
          spaceId,
          conversationId,
          ...diagram,
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
  ): Promise<InvestigationComponentDiagram | undefined> {
    return this.deps.documents.get(componentDiagramDocumentId(spaceId, conversationId), spaceId);
  }
}
