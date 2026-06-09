/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

interface SlackOriginResponse {
  from_slack: boolean;
  origin_ref: string | null;
}

interface SlackConversationState {
  isLoading: boolean;
  fromSlack: boolean;
  originRef: string | null;
}

/**
 * Determines whether a conversation originated from Slack (POC).
 *
 * The Elastic Ramen (elastic_console) plugin owns the Slack integration and
 * tracks Slack-originated conversations via a saved object keyed by conversation
 * id. This hook queries that plugin's internal endpoint. When the endpoint is
 * unavailable (plugin disabled / not installed), the conversation is treated as
 * a normal, non-Slack conversation.
 */
export const useSlackConversation = (conversationId: string | undefined) => {
  const {
    services: { http },
  } = useKibana();

  const [state, setState] = useState<SlackConversationState>({
    isLoading: false,
    fromSlack: false,
    originRef: null,
  });

  useEffect(() => {
    if (!conversationId) {
      setState({ isLoading: false, fromSlack: false, originRef: null });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, isLoading: true }));

    http
      .get<SlackOriginResponse>(`/internal/elastic_ramen/conversations/${conversationId}/slack`)
      .then((res) => {
        if (cancelled) return;
        setState({ isLoading: false, fromSlack: res.from_slack, originRef: res.origin_ref });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ isLoading: false, fromSlack: false, originRef: null });
      });

    return () => {
      cancelled = true;
    };
  }, [conversationId, http]);

  const forkConversation = useCallback(async (): Promise<string> => {
    const res = await http.post<{ id: string }>(
      `/internal/elastic_ramen/conversations/${conversationId}/fork`
    );
    return res.id;
  }, [conversationId, http]);

  return { ...state, forkConversation };
};
