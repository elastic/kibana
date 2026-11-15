/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import type { Impact, ImpactEntity } from '../../../common/impact/impact';
import { MAX_IMPACT_CONVERSATION_IDS } from '../../../common/impact/constants';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { filterReadableConversationIds } from '../../investigations/services/readable_conversation_ids';
import { MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS } from '../../investigation_attachments/attachment_doc_service';
import type { ImpactService } from './impact_service';

/**
 * In-process impact reads. The space and the principal both come from the
 * request, so a caller cannot supply another space or skip the investigations
 * read privilege (read or manage). Impact of a conversation the caller cannot read is left out, as
 * if it had none.
 */
export interface ImpactReadClient {
  listByConversationIds: (conversationIds: string[]) => Promise<Impact[]>;
  /**
   * Each entity's `id`, `type`, and `name` per conversation. Ids are deduped and read in chunks,
   * so callers are not bound by the per-read cap. Conversations without an Impact document are
   * absent from the map.
   */
  getEntitiesByConversationId: (
    conversationIds: string[]
  ) => Promise<Map<string, Array<Pick<ImpactEntity, 'id' | 'type' | 'name'>>>>;
  /**
   * Conversations whose impact lists the entity, for filtering a list by an Impact pill. Bounded
   * by {@link MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS}; conversations the caller cannot read
   * are left out.
   */
  searchConversationIdsByEntityId: (entityId: string) => Promise<string[]>;
}

export interface ImpactClientDeps {
  getImpactService: () => ImpactService;
  getSpaceId: (request: KibanaRequest) => string;
  privileges: InvestigationsPrivilegesChecker;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}

/**
 * Builds a request-scoped reader. The privilege check runs before any search. The impact index
 * (read as the internal user) is only read for conversations the caller can read.
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

    const getEntitiesByConversationId: ImpactReadClient['getEntitiesByConversationId'] = async (
      conversationIds
    ) => {
      await privileges.assertCanRead(request);
      const readableIds = await filterReadableConversationIds(
        await getConversationClient(request),
        conversationIds
      );
      const spaceId = getSpaceId(request);
      const chunks = Array.from(
        { length: Math.ceil(readableIds.length / MAX_IMPACT_CONVERSATION_IDS) },
        (_, index) =>
          readableIds.slice(
            index * MAX_IMPACT_CONVERSATION_IDS,
            (index + 1) * MAX_IMPACT_CONVERSATION_IDS
          )
      );
      const impacts = (
        await Promise.all(
          chunks.map((chunk) => getImpactService().listByConversationIds(chunk, spaceId))
        )
      ).flat();
      return new Map(
        impacts.map((impact) => [
          impact.conversationId,
          (impact.entities ?? []).map(({ id, type, name }) => ({
            id,
            type,
            ...(name !== undefined ? { name } : {}),
          })),
        ])
      );
    };

    return {
      listByConversationIds,
      getEntitiesByConversationId,
      searchConversationIdsByEntityId: async (entityId) => {
        await privileges.assertCanRead(request);
        const conversationIds = await getImpactService()
          .getDocumentService()
          .searchConversationIds({
            spaceId: getSpaceId(request),
            size: MAX_INVESTIGATION_CANDIDATE_CONVERSATION_IDS,
            filter: [
              {
                nested: { path: 'entities', query: { term: { 'entities.id': entityId } } },
              },
            ],
          });
        return filterReadableConversationIds(await getConversationClient(request), conversationIds);
      },
    };
  };
