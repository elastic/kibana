/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../common/lib/kibana';
import { casesQueriesKeys } from '../../containers/constants';

const AGENT_BUILDER_CONVERSATION_API_VERSION = '2023-10-31';

/**
 * Whether `conversationId` is readable by the current user. Checked upfront so a
 * source link is only ever rendered when it's actually openable — a disabled or
 * dead link would be worse than the extra request. Cached per conversation id.
 */
export const useCanOpenAgentConversation = (conversationId?: string): boolean => {
  const { agentBuilder, application, http } = useKibana().services;
  const getConversation = http?.get;
  const enabled =
    conversationId != null &&
    conversationId.length > 0 &&
    Boolean(agentBuilder?.openChat) &&
    application?.capabilities?.agentBuilder?.show === true &&
    getConversation != null;

  const { data } = useQuery(
    casesQueriesKeys.conversationAccess(conversationId ?? ''),
    async ({ signal }) => {
      if (conversationId == null || getConversation == null) {
        return false;
      }

      await getConversation(
        `/api/agent_builder/conversations/${encodeURIComponent(conversationId)}`,
        {
          version: AGENT_BUILDER_CONVERSATION_API_VERSION,
          signal,
        }
      );
      return true;
    },
    {
      enabled,
      retry: false,
    }
  );

  return Boolean(enabled && data);
};
