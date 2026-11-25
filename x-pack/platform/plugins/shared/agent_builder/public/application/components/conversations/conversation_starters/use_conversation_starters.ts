/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ConversationStarter } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useAgentId } from '../../../hooks/use_conversation';
import { useAgentModel } from '../../../hooks/agents/use_agent_model';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';
import { useSubmitMessage } from '../../../hooks/use_submit_message';
import { DEFAULT_CONVERSATION_STARTERS } from './default_conversation_starters';
import type { ConversationStartersSource } from './resolve_conversation_starters';
import { resolveConversationStarters } from './resolve_conversation_starters';

const STARTERS_SOURCE: ConversationStartersSource = 'default';

/**
 * The starters to show, and how to send one. They are shown for the default Elastic AI agent only,
 * and only while the experimental features setting is on, until their copy is final. A click sends
 * the label as the message, which creates the conversation and moves the user to it.
 */
export const useConversationStarters = () => {
  const agentId = useAgentId();
  const { submitMessage, isCreatingConversation } = useSubmitMessage();
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);
  const isExperimentalFeaturesEnabled = useExperimentalFeatures();

  const canShow = isExperimentalFeaturesEnabled && agentId === agentBuilderDefaultAgentId;

  const starters = useMemo(
    () =>
      canShow
        ? resolveConversationStarters({ defaultStarters: DEFAULT_CONVERSATION_STARTERS })
        : [],
    [canShow]
  );

  const onSelect = useCallback(
    ({ label }: ConversationStarter) => {
      void submitMessage(label);
    },
    [submitMessage]
  );

  return {
    starters,
    source: STARTERS_SOURCE,
    onSelect,
    isDisabled: isCreatingConversation || isAgentModelLoading,
  };
};
