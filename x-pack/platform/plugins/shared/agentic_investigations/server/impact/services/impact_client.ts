/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { Impact } from '../../../common/impact/impact';
import { MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { filterReadableConversationIds } from '../../investigations/services/readable_conversation_ids';
import type { ImpactService } from './impact_service';

/**
 * In-process impact reads. The space and the principal both come from the
 * request, so a caller cannot supply another space or skip the investigations
 * read privilege (read or manage). Impact of a conversation the caller cannot
 * read is left out, as if it had none.
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
  privileges: InvestigationsPrivilegesChecker;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/**
 * Builds a request-scoped reader. The privilege check runs before any search, and the impact
 * index (read as the internal user) is only read for conversations the caller can read.
 */
export const createImpactClient =
  ({ getImpactService, getSpaceId, privileges, getConversationClient }: ImpactClientDeps) =>
  (request: KibanaRequest): ImpactReadClient => {
    const listByConversationIds: ImpactReadClient['listByConversationIds'] = async (
      conversationIds
    ) => {
      await privileges.assertCanRead(request);
      const readableIds = await filterReadableConversationIds(
        await getConversationClient(request),
        conversationIds
      );
      if (readableIds.length === 0) {
        return [];
      }
      return getImpactService().listByConversationIds(readableIds, getSpaceId(request));
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
              (impact.entities ?? []).map((entity) => entity.id)
            );
          }
        }
        return entityIds;
      },
    };
  };
