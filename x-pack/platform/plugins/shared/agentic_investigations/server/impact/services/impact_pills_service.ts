/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { entityStoreIdType, type ImpactPill } from '@kbn/agentic-investigations-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import type {
  ImpactPillsPageQuery,
  ImpactPillsResponse,
  ProposalImpactPillsQuery,
} from '../../../common/impact/impact_pills';
import type { EscalationsService } from '../../escalations/services/escalations_service';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { applyEntityStoreNames } from './entity_store_names';
import { buildImpactPills } from './impact_pills';
import type { ImpactPillEntity } from './impact_pills';
import type { ImpactService } from './impact_service';
import { queryProposalPills } from './proposal_pills_query';

export interface ImpactPillsServiceDeps {
  esClient: ElasticsearchClient;
  logger: Logger;
  getImpactService: () => ImpactService;
  privileges: InvestigationsPrivilegesChecker;
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

const toResponse = (
  pills: ImpactPill[],
  total: number,
  { from }: ImpactPillsPageQuery
): ImpactPillsResponse => ({
  pills,
  total,
  remaining: Math.max(0, total - from - pills.length),
});

/** Entity pills over a whole queue, one page at a time. */
export class ImpactPillsService {
  constructor(private readonly deps: ImpactPillsServiceDeps) {}

  /** Pills over the open proposals of `categories` plus those decided within `decidedWithinHours`. */
  async forProposals(
    request: KibanaRequest,
    query: ProposalImpactPillsQuery
  ): Promise<ImpactPillsResponse> {
    const proposals = this.deps.getProposals();
    if (!proposals) return toResponse([], 0, query);

    await proposals.getProposalPrivileges().assertCanRead(request);
    await this.deps.privileges.assertCanRead(request);
    const spaceId = this.deps.getSpaceId(request);
    const impact = this.deps.getImpactService();
    await impact.reconcileMappings();
    const { rows, total } = await queryProposalPills({
      ...query,
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      spaceId,
    });

    const labels = await impact.getEntityLabels(
      rows.map(({ entityId }) => entityId),
      spaceId
    );
    const pills = rows.map(({ entityId, count }): ImpactPill => {
      const { type, name } = labels.get(entityId) ?? {};
      const entityType = type ?? entityStoreIdType(entityId);
      return {
        entityId,
        count,
        ...(entityType ? { entityType } : {}),
        ...(name ? { name } : {}),
      };
    });
    return toResponse(await this.withEntityStoreNames(request, pills), total, query);
  }

  /** Pills over every open and closed escalation, one row each. */
  async forEscalations(
    request: KibanaRequest,
    page: ImpactPillsPageQuery
  ): Promise<ImpactPillsResponse> {
    const escalations = this.deps.getEscalationsService();
    if (!escalations) return toResponse([], 0, page);

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
    const all = buildImpactPills(weights, entities);
    const pills = all.slice(page.from, page.from + page.size);
    return toResponse(await this.withEntityStoreNames(request, pills), all.length, page);
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
