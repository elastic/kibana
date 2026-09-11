/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';

export interface UseOpenConversationDetailsResult {
  /** Opens the Agent Builder conversation details flyout, replacing any already-open one. */
  openConversationDetails: (conversationId: string) => void;
  /** Id of the conversation currently shown, so callers can mark the originating card selected. */
  openConversationId?: string;
}

/**
 * Opens the Agent Builder details flyout for a conversation.
 *
 * Must be called from within a `KibanaContextProvider` (i.e. the page, not a flyout slot).
 */
export const useOpenConversationDetails = (): UseOpenConversationDetailsResult => {
  const { services } = useKibana<{ agentBuilder?: AgentBuilderPluginStart }>();
  const { agentBuilder } = services;

  const closeRef = useRef<(() => void) | undefined>(undefined);
  const requestIdRef = useRef(0);
  const [openConversationId, setOpenConversationId] = useState<string | undefined>(undefined);

  // The flyout is an overlay, so it would outlive the page that opened it.
  useEffect(
    () => () => {
      requestIdRef.current += 1;
      closeRef.current?.();
      closeRef.current = undefined;
    },
    []
  );

  const openConversationDetails = useCallback(
    (conversationId: string) => {
      if (!agentBuilder) {
        return;
      }

      const requestId = (requestIdRef.current += 1);

      // Only one details flyout at a time; its `onClose` runs asynchronously and is guarded on id.
      closeRef.current?.();
      closeRef.current = undefined;
      setOpenConversationId(conversationId);

      agentBuilder
        .openConversationDetails({
          conversationId,
          onClose: () => {
            setOpenConversationId((current) => (current === conversationId ? undefined : current));
          },
        })
        .then((close) => {
          if (requestIdRef.current === requestId) {
            closeRef.current = close;
          } else {
            // Superseded before the flyout finished opening.
            close();
          }
        });
    },
    [agentBuilder]
  );

  return { openConversationDetails, openConversationId };
};
