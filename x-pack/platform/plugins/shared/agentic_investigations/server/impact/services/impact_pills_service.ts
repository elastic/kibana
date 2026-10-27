/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { entityStoreIdType, type ImpactPill } from '@kbn/agentic-investigations-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { ProposalImpactPillsQuery } from '../../../common/impact/impact_pills';
import type { EscalationsService } from '../../escalations/services/escalations_service';
import { applyEntityStoreNames } from './entity_store_names';
import { buildImpactPills } from './impact_pills';
import type { ImpactPillEntity } from './impact_pills';
import type { ImpactReadClient } from './impact_client';

/** Conversations a queue can hold, matching the deepest page a queue can reach. */
const MAX_PILL_CONVERSATIONS = 10_000;

export interface ImpactPillsServiceDeps {
  getImpactClient: (request: KibanaRequest) => ImpactReadClient;
  getSpaceId: (request: KibanaRequest) => string;
  getProposals: () => ProposalsPluginStart | undefined;
  getEscalationsService: () => EscalationsService | undefined;
  /**
   * Entity Store `entity.name` by id. Absent when Entity Store is not installed. Must not throw:
   * a failed read is an empty map, and pills keep the name stored on the impact.
   */
  getEntityStoreNames?: (
    request: KibanaRequest,
    entityIds: readonly string[]
  ) => Promise<ReadonlyMap<string, string>>;
}

/** Entity pills over a whole queue, so they do not move with paging or open sections. */
export class ImpactPillsService {
  constructor(private readonly deps: ImpactPillsServiceDeps) {}

  /** Pills over the open proposals of `categories` plus those decided within `decidedWithinHours`. */
  async forProposals(
    request: KibanaRequest,
    { origin, categories, decidedWithinHours }: ProposalImpactPillsQuery
  ): Promise<ImpactPill[]> {
    const proposals = this.deps.getProposals();
    if (!proposals) return [];

    await proposals.getProposalPrivileges().assertCanRead(request);
    const spaceId = this.deps.getSpaceId(request);
    const service = proposals.getProposalsService();
    const [open, closed] = await Promise.all([
      service.countByConversation(
        {
          origin,
          categories,
          status: 'pending',
          excludeSuperseded: true,
          excludeExpired: false,
        },
        spaceId,
        MAX_PILL_CONVERSATIONS
      ),
      decidedWithinHours === undefined
        ? new Map<string, number>()
        : service.countByConversation(
            {
              origin,
              decidedWithinHours,
              excludeSuperseded: true,
              excludeExpired: false,
            },
            spaceId,
            MAX_PILL_CONVERSATIONS
          ),
    ]);

    const weights = new Map(open);
    for (const [conversationId, count] of closed) {
      weights.set(conversationId, (weights.get(conversationId) ?? 0) + count);
    }
    const entities = await this.deps
      .getImpactClient(request)
      .getEntitiesByConversationId([...weights.keys()]);
    return this.withEntityStoreNames(request, buildImpactPills(weights, entities));
  }

  /** Pills over every open and closed escalation, one row each. */
  async forEscalations(request: KibanaRequest): Promise<ImpactPill[]> {
    const escalations = this.deps.getEscalationsService();
    if (!escalations) return [];

    const [open, closed] = await Promise.all([
      escalations.scanWithEntityIds(request, { status: 'open' }),
      escalations.scanWithEntityIds(request, { status: 'closed' }),
    ]);
    const weights = new Map<string, number>();
    const entities = new Map<string, ImpactPillEntity[]>();
    for (const { id, entity_ids: ids, entity_types: types, entity_names: names } of [
      ...open,
      ...closed,
    ]) {
      weights.set(id, 1);
      entities.set(
        id,
        (ids ?? []).map((entityId) => ({
          id: entityId,
          type: types?.[entityId],
          name: names?.[entityId],
        }))
      );
    }
    return this.withEntityStoreNames(request, buildImpactPills(weights, entities));
  }

  /** Replaces a stored name with Entity Store `entity.name` for ids the store knows. */
  private async withEntityStoreNames(
    request: KibanaRequest,
    pills: ImpactPill[]
  ): Promise<ImpactPill[]> {
    const lookup = this.deps.getEntityStoreNames;
    if (!lookup || pills.length === 0) {
      return pills;
    }
    const ids = pills.map((pill) => pill.entityId).filter((id) => entityStoreIdType(id));
    if (ids.length === 0) {
      return pills;
    }
    return applyEntityStoreNames(pills, await lookup(request, ids));
  }
}
