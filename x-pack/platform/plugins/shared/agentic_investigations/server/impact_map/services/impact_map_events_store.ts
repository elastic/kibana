/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ImpactMapEvent } from '../../../common/impact_map/impact_map';
import { hashInvestigationAttachmentId } from '../../investigation_attachments';
import type { ImpactMapEventDocument } from '../storage/impact_map_storage';

/** The part of the storage client the store writes with. */
export interface ImpactMapEventsStorage {
  bulk: (request: {
    operations: Array<{ index: { _id: string; document: ImpactMapEventDocument } }>;
    throwOnFail?: boolean;
  }) => Promise<unknown>;
}

/** One document per space, conversation and event, so a later write updates the same event. */
export const impactMapEventDocumentId = (
  spaceId: string,
  conversationId: string,
  eventId: string
): string => hashInvestigationAttachmentId('impact_map_event', spaceId, conversationId, eventId);

export const toImpactMapEventDocument = ({
  spaceId,
  conversationId,
  event,
  now = new Date().toISOString(),
}: {
  spaceId: string;
  conversationId: string;
  event: ImpactMapEvent;
  now?: string;
}): ImpactMapEventDocument => ({
  spaceId,
  conversationId,
  eventId: event.id,
  kind: event.kind,
  title: event.title,
  ...(event.description && { description: event.description }),
  at: event.at,
  ...(event.ends_at && { endsAt: event.ends_at }),
  ...(event.entity_id && { entityId: event.entity_id }),
  ...(event.relationship_id && { relationshipId: event.relationship_id }),
  event,
  updatedAt: now,
});

/**
 * Writes every event of a map to the events index. The map document stays the record the flyout
 * reads, so a failed write here is logged and does not fail the investigation.
 */
export class ImpactMapEventsStore {
  constructor(private readonly deps: { storage: ImpactMapEventsStorage; logger: Logger }) {}

  async write({
    spaceId,
    conversationId,
    events,
  }: {
    spaceId: string;
    conversationId: string;
    events: readonly ImpactMapEvent[];
  }): Promise<void> {
    if (events.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    try {
      await this.deps.storage.bulk({
        operations: events.map((event) => ({
          index: {
            _id: impactMapEventDocumentId(spaceId, conversationId, event.id),
            document: toImpactMapEventDocument({ spaceId, conversationId, event, now }),
          },
        })),
        throwOnFail: true,
      });
    } catch (error) {
      this.deps.logger.warn(
        `Could not write ${events.length} events of ${conversationId} to the events index: ${error}`
      );
    }
  }
}
