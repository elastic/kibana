/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type { ImpactPill } from '@kbn/agentic-investigations-common';
import type { ProposalImpactPillsQuery } from '../../../common/impact/impact_pills';
import type { EscalationsService } from '../../escalations/services/escalations_service';
import { buildImpactPills } from './impact_pills';
import type { ImpactPillEntity } from './impact_pills';
import type { ImpactReadClient } from './impact_client';

/** Conversations a queue can hold, matching the deepest page a queue can reach. */
const MAX_PILL_CONVERSATIONS = 10_000;

export interface ImpactPillsServiceDeps {
  logger: Logger;
  getImpactClient: (request: KibanaRequest) => ImpactReadClient;
  getSpaceId: (request: KibanaRequest) => string;
  getProposals: () => ProposalsPluginStart | undefined;
  getEscalationsService: () => EscalationsService | undefined;
}

/**
 * The entities across a whole queue, rather than across the rows a client happens to have loaded,
 * so the pills do not move with paging or with which sections are open. A failed impact read
 * yields no pills, like a missing title: the queue stays usable.
 */
export class ImpactPillsService {
  constructor(private readonly deps: ImpactPillsServiceDeps) {}

  /**
   * Pills over the open proposals of `categories` plus those decided within `decidedWithinHours`.
   * The filters are the ones AlertZero's queue sections list by, so a pill counts exactly the rows
   * its sections hold.
   */
  async forProposals(
    request: KibanaRequest,
    { origin, categories, decidedWithinHours }: ProposalImpactPillsQuery
  ): Promise<ImpactPill[]> {
    const proposals = this.deps.getProposals();
    if (!proposals) return [];

    try {
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
            excludeUndecidedSuperseded: false,
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
                excludeSuperseded: false,
                excludeUndecidedSuperseded: true,
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
      return buildImpactPills(weights, entities);
    } catch (error) {
      this.deps.logger.debug(`Could not build proposal impact pills: ${String(error)}`);
      return [];
    }
  }

  /** Pills over every open and closed escalation, one row each. */
  async forEscalations(request: KibanaRequest): Promise<ImpactPill[]> {
    const escalations = this.deps.getEscalationsService();
    if (!escalations) return [];

    try {
      const [open, closed] = await Promise.all([
        escalations.scanWithEntityIds(request, { status: 'open' }),
        escalations.scanWithEntityIds(request, { status: 'closed' }),
      ]);
      const weights = new Map<string, number>();
      const entities = new Map<string, ImpactPillEntity[]>();
      for (const { id, entity_ids: ids, entity_types: types } of [...open, ...closed]) {
        weights.set(id, 1);
        entities.set(
          id,
          (ids ?? []).map((entityId) => ({ id: entityId, type: types?.[entityId] }))
        );
      }
      return buildImpactPills(weights, entities);
    } catch (error) {
      this.deps.logger.debug(`Could not build escalation impact pills: ${String(error)}`);
      return [];
    }
  }
}
