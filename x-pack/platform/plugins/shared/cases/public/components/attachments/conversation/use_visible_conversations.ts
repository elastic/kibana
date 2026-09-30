/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL } from '../../../../common/constants';
import type {
  BulkGetConversationsResponse,
  ConversationSummary,
} from '../../../../common/types/api/agent_builder/v1';
import type { CaseUI } from '../../../../common/ui/types';
import { useKibana } from '../../../common/lib/kibana';
import { casesQueriesKeys } from '../../../containers/constants';
import { applyConversationAccess, getConversationAttachmentIds } from './helpers';

/**
 * Resolves which of `ids` the current user can open, with their live title and
 * agent. Errors are treated as "nothing readable" so the case still renders.
 */
export const useBulkGetConversations = (ids: string[]) => {
  const {
    services: { http, application },
  } = useKibana();
  const enabled = ids.length > 0 && application.capabilities.agentBuilder?.show === true;

  return useQuery<Map<string, ConversationSummary>>(
    casesQueriesKeys.conversationsAccess(ids),
    async ({ signal }) => {
      const res = await http.post<BulkGetConversationsResponse>(
        INTERNAL_AGENT_BUILDER_CONVERSATIONS_BULK_GET_URL,
        { body: JSON.stringify({ ids }), signal }
      );
      return new Map(res.conversations.map((conversation) => [conversation.id, conversation]));
    },
    { enabled, keepPreviousData: true, refetchOnWindowFocus: false }
  );
};

export const useCaseDataWithVisibleConversations = (caseData: CaseUI): CaseUI => {
  const ids = useMemo(() => getConversationAttachmentIds(caseData.comments), [caseData.comments]);
  const { data } = useBulkGetConversations(ids);
  return useMemo(() => applyConversationAccess(caseData, data), [caseData, data]);
};
