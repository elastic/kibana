/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Impact } from '../../../common/impact/impact';
import { MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import type { ImpactPrivilegesChecker } from './check_impact_privileges';
import type { ImpactService } from './impact_service';

/**
 * In-process impact reads. The space and the principal both come from the
 * request, so a caller cannot supply another space or skip the investigations
 * manage privilege.
 */
export interface ImpactReadClient {
  listByConversationIds: (conversationIds: string[]) => Promise<Impact[]>;
  /**
   * Entity ids per conversation, for landing-page hydration. Ids are deduped and read in
   * chunks, so callers are not bound by the per-read cap. Conversations without an Impact
   * document are absent from the map.
   */
  getEntityIdsByConversationId: (conversationIds: string[]) => Promise<Map<string, string[]>>;
}

export interface ImpactClientDeps {
  getImpactService: () => ImpactService;
  getSpaceId: (request: KibanaRequest) => string;
  privileges: ImpactPrivilegesChecker;
}

/** Builds a request-scoped reader. The privilege check runs before any search. */
export const createImpactClient =
  ({ getImpactService, getSpaceId, privileges }: ImpactClientDeps) =>
  (request: KibanaRequest): ImpactReadClient => {
    const listByConversationIds: ImpactReadClient['listByConversationIds'] = async (
      conversationIds
    ) => {
      await privileges.assertCanRead(request);
      return getImpactService().listByConversationIds(conversationIds, getSpaceId(request));
    };

    return {
      listByConversationIds,
      getEntityIdsByConversationId: async (conversationIds) => {
        const uniqueIds = [...new Set(conversationIds)];
        const entityIds = new Map<string, string[]>();
        for (let i = 0; i < uniqueIds.length; i += MAX_IMPACT_CONVERSATION_IDS) {
          const impacts = await listByConversationIds(
            uniqueIds.slice(i, i + MAX_IMPACT_CONVERSATION_IDS)
          );
          for (const impact of impacts) {
            entityIds.set(
              impact.conversationId,
              impact.entities.map((entity) => entity.id)
            );
          }
        }
        return entityIds;
      },
    };
  };
