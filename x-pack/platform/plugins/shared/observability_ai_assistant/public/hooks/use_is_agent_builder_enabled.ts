/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useKibana } from './use_kibana';

export interface UseIsAgentBuilderEnabledResult {
  /**
   * True when the Agent Builder experience is enabled for the user.
   * This requires:
   * - Chat experience being set to Agent
   * - Agent Builder capability (RBAC) enabled
   */
  isAgentBuilderEnabled: boolean;

  /**
   * True when the user has the Agent Builder capability (RBAC).
   */
  hasAgentBuilderAccess: boolean;

  /**
   * True when the preferred chat experience is set to Agent.
   */
  isAgentChatExperienceEnabled: boolean;
}

export const useIsAgentBuilderEnabled = (): UseIsAgentBuilderEnabledResult => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE);

  const {
    application: { capabilities },
  } = useKibana().services;

  const hasAgentBuilderAccess = capabilities?.agentBuilder?.show === true;
  const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;

  return {
    isAgentBuilderEnabled: hasAgentBuilderAccess && isAgentChatExperienceEnabled,
    hasAgentBuilderAccess,
    isAgentChatExperienceEnabled,
  };
};
