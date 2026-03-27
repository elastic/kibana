/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { ConversationInput } from '../application/components/conversations/conversation_input/conversation_input';
import { storageKeys } from '../application/storage_keys';

const noopOnClose = () => {};

// localStorage key for the last-used agent
const AGENT_ID_STORAGE_KEY = storageKeys.agentId;

/**
 * A slim embeddable that renders only the ConversationInput (no flyout chrome,
 * no message history panel, no license gate).
 *
 * To avoid the "agent deleted" disabled state, it resolves a valid agentId
 * from the server agent list before mounting the full provider.
 */
export const EmbeddableConversationInputInternal: React.FC<
  Omit<EmbeddableConversationInternalProps, 'onClose' | 'ariaLabelledBy'>
> = ({ services, coreStart, ...props }) => {
  const [resolvedAgentId, setResolvedAgentId] = useState<string | undefined>(props.agentId);
  const [agentsResolved, setAgentsResolved] = useState(Boolean(props.agentId));

  useEffect(() => {
    if (props.agentId) {
      // Caller supplied an explicit agentId — trust it.
      setResolvedAgentId(props.agentId);
      setAgentsResolved(true);
      return;
    }

    let cancelled = false;
    services.agentService
      .list()
      .then((agents) => {
        if (cancelled || agents.length === 0) {
          setAgentsResolved(true);
          return;
        }
        // Prefer the last-used agent from localStorage if it's still valid.
        const storedId = localStorage.getItem(AGENT_ID_STORAGE_KEY) ?? undefined;
        const storedAgent = storedId ? agents.find((a) => a.id === storedId) : undefined;
        setResolvedAgentId(storedAgent?.id ?? agents[0]?.id);
        setAgentsResolved(true);
      })
      .catch(() => {
        if (!cancelled) setAgentsResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [services.agentService, props.agentId]);

  if (!agentsResolved) {
    return null;
  }

  return (
    <EmbeddableConversationsProvider
      {...props}
      services={services}
      coreStart={coreStart}
      agentId={resolvedAgentId}
      onClose={noopOnClose}
      ariaLabelledBy=""
    >
      <ConversationInput />
    </EmbeddableConversationsProvider>
  );
};

