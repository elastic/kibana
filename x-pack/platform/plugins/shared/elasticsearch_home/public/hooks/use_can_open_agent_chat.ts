/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useHomeServices } from '../context';

/**
 * Whether to offer the Agent Builder chat: the user needs the Agent Builder privilege, and the
 * "Chat experience" setting (`aiAssistant:preferredChatExperience`) must be set to Agent.
 * The chat itself prompts for a license or an LLM connector when either is missing.
 */
export const useCanOpenAgentChat = (): boolean => {
  const { agentBuilder, application, settings } = useHomeServices();
  const canShowAgentBuilder =
    agentBuilder !== undefined && application.capabilities.agentBuilder?.show === true;

  const chatExperience$ = useMemo(
    () =>
      canShowAgentBuilder ? settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE) : EMPTY,
    [canShowAgentBuilder, settings]
  );
  const chatExperience = useObservable(chatExperience$);

  return canShowAgentBuilder && chatExperience === AIChatExperience.Agent;
};
