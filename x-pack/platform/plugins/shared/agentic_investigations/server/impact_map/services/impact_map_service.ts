/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentPublicClient,
  ConversationPublicClient,
  ToolHandlerContext,
} from '@kbn/agent-builder-server';
import type {
  ImpactMapEntity,
  ImpactMapEntityType,
  ImpactMapRelationship,
  ImpactMapRelationshipType,
  InvestigationImpactMap,
} from '../../../common/impact_map/impact_map';
import {
  mergeImpactMapEvents,
  withImpactMapEventId,
  type ImpactMapEventInput,
} from '../../../common/impact_map/events';
import {
  resolveImpactMapGraph,
  type ResolvedImpactMapGraph,
} from '../../../common/impact_map/resolve_graph';
import type { User } from '../../../common/user';
import {
  InvestigationAttachmentInvalidRequestError,
  type AttachedFromTool,
  type InvestigationAttachmentDocService,
} from '../../investigation_attachments';
import { impactMapAttachment } from '../attachments/impact_map_attachment_type';
import type { ImpactMapDocument } from '../storage/impact_map_storage';
import type { ImpactMapCatalogService } from './impact_map_catalog_service';
import type { ImpactMapEventsStore } from './impact_map_events_store';

/** The map a caller writes. Types sent here are added to the space catalog too. */
export interface ImpactMapInput {
  title?: string;
  entities: ImpactMapEntity[];
  relationships: ImpactMapRelationship[];
  entity_types?: ImpactMapEntityType[];
  relationship_types?: ImpactMapRelationshipType[];
  /** Merged by id with the events already stored. An event without an id gets a stable one. */
  events?: ImpactMapEventInput[];
}

/** One impact map document per space and conversation. */
export const impactMapDocumentId = (spaceId: string, conversationId: string): string =>
  impactMapAttachment.documentId(spaceId, conversationId);

const buildImpactMapDocument = ({
  existing,
  spaceId,
  conversationId,
  title,
  graph,
  events,
  user,
}: {
  existing: ImpactMapDocument | undefined;
  spaceId: string;
  conversationId: string;
  title?: string;
  /** Absent when only events are written: the stored graph stays. */
  graph?: ResolvedImpactMapGraph;
  events?: ImpactMapEventInput[];
  user?: User;
}): ImpactMapDocument => {
  const now = new Date().toISOString();
  const createdBy = existing ? existing.createdBy : user;
  const mergedTitle = title ?? existing?.title;
  return {
    spaceId,
    conversationId,
    ...(mergedTitle && { title: mergedTitle }),
    entities: graph?.entities ?? existing?.entities ?? [],
    relationships: graph?.relationships ?? existing?.relationships ?? [],
    entityTypes: graph?.entityTypes ?? existing?.entityTypes ?? [],
    relationshipTypes: graph?.relationshipTypes ?? existing?.relationshipTypes ?? [],
    events: mergeImpactMapEvents(existing?.events, events?.map(withImpactMapEventId)),
    createdAt: existing?.createdAt ?? now,
    ...(createdBy && { createdBy }),
    updatedAt: now,
  };
};

/**
 * Owns the impact map index. Each write is a snapshot of the graph: the map the caller sends
 * replaces the stored one, while its events are merged into the stored events by id. Before the write the graph is joined with the space catalog, and any type it adds
 * is stored there, so the next investigation draws it the same way.
 */
export class ImpactMapService {
  constructor(
    private readonly deps: {
      documents: InvestigationAttachmentDocService<ImpactMapDocument>;
      catalog: ImpactMapCatalogService;
      /** Every write also puts the map's events in their own index. */
      events?: ImpactMapEventsStore;
    }
  ) {}

  private async writeEvents(document: ImpactMapDocument): Promise<void> {
    await this.deps.events?.write({
      spaceId: document.spaceId,
      conversationId: document.conversationId,
      events: document.events ?? [],
    });
  }

  getDocumentService(): InvestigationAttachmentDocService<ImpactMapDocument> {
    return this.deps.documents;
  }

  getCatalogService(): ImpactMapCatalogService {
    return this.deps.catalog;
  }

  /** Joins the graph with the catalog, stores new types, and throws when it can't be drawn. */
  private async resolve(
    spaceId: string,
    input: ImpactMapInput,
    user?: User
  ): Promise<ResolvedImpactMapGraph> {
    const graph = resolveImpactMapGraph({
      entities: input.entities,
      relationships: input.relationships,
      catalog: await this.deps.catalog.getWithBuiltIns(spaceId),
      entityTypes: input.entity_types,
      relationshipTypes: input.relationship_types,
    });
    if (graph.errors.length > 0) {
      throw new InvestigationAttachmentInvalidRequestError(
        `The impact map was not saved: ${graph.errors.join(' ')}`
      );
    }
    // Inline types the catalog already had may carry a better label or icon, so they are stored
    // as well as the ones it lacked.
    await this.deps.catalog.upsert({
      spaceId,
      types: {
        entity_types: [...(input.entity_types ?? []), ...graph.newTypes.entity_types],
        relationship_types: [
          ...(input.relationship_types ?? []),
          ...graph.newTypes.relationship_types,
        ],
      },
      user,
    });
    return graph;
  }

  /** Agent tool path: replaces the map, then adds or updates the attachment in the run. */
  async setFromTool({
    context,
    conversationId,
    input,
    user,
  }: {
    context: Pick<ToolHandlerContext, 'attachments' | 'request' | 'spaceId'>;
    conversationId: string;
    input: ImpactMapInput;
    user?: User;
  }): Promise<AttachedFromTool<ImpactMapDocument> & { warnings: string[] }> {
    const { spaceId } = context;
    const graph = await this.resolve(spaceId, input, user);
    let built: ImpactMapDocument | undefined;
    const attached = await impactMapAttachment.writeFromTool({
      service: this.deps.documents,
      id: impactMapDocumentId(spaceId, conversationId),
      spaceId,
      context,
      mutate: (existing) =>
        (built = buildImpactMapDocument({
          existing,
          spaceId,
          conversationId,
          title: input.title,
          graph,
          events: input.events,
          user,
        })),
    });
    if (built) {
      await this.writeEvents(built);
    }
    return { ...attached, warnings: graph.warnings };
  }

  /** Out-of-run path (a hook, a workflow, a background pass): no tool context. */
  async setWithPublicClient({
    conversationId,
    input,
    spaceId,
    user,
    conversations,
    attachments,
  }: {
    conversationId: string;
    input: ImpactMapInput;
    spaceId: string;
    user?: User;
    conversations: ConversationPublicClient;
    attachments: AttachmentPublicClient;
  }): Promise<{ warnings: string[] }> {
    const graph = await this.resolve(spaceId, input, user);
    let built: ImpactMapDocument | undefined;
    await impactMapAttachment.writeAndAttach({
      service: this.deps.documents,
      id: impactMapDocumentId(spaceId, conversationId),
      spaceId,
      conversationId,
      conversations,
      attachments,
      mutate: (existing) =>
        (built = buildImpactMapDocument({
          existing,
          spaceId,
          conversationId,
          title: input.title,
          graph,
          events: input.events,
          user,
        })),
    });
    if (built) {
      await this.writeEvents(built);
    }
    return { warnings: graph.warnings };
  }

  /** Out-of-run path that adds or updates events and leaves the graph as it is. */
  async addEventsWithPublicClient({
    conversationId,
    events,
    spaceId,
    user,
    conversations,
    attachments,
  }: {
    conversationId: string;
    events: ImpactMapEventInput[];
    spaceId: string;
    user?: User;
    conversations: ConversationPublicClient;
    attachments: AttachmentPublicClient;
  }): Promise<void> {
    if (events.length === 0) {
      return;
    }
    let built: ImpactMapDocument | undefined;
    await impactMapAttachment.writeAndAttach({
      service: this.deps.documents,
      id: impactMapDocumentId(spaceId, conversationId),
      spaceId,
      conversationId,
      conversations,
      attachments,
      mutate: (existing) =>
        (built = buildImpactMapDocument({ existing, spaceId, conversationId, events, user })),
    });
    if (built) {
      await this.writeEvents(built);
    }
  }

  async findByConversationId(
    conversationId: string,
    spaceId: string
  ): Promise<InvestigationImpactMap | undefined> {
    return this.deps.documents.get(impactMapDocumentId(spaceId, conversationId), spaceId);
  }
}
