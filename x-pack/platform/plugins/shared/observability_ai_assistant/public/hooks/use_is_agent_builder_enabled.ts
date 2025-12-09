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

/**
 * Hook that returns true when the Agent Builder experience is enabled.
 * This requires:
 * - Chat experience set to Agent
 * - Agent Builder capability (RBAC) enabled
 */
export const useIsAgentBuilderEnabled = (): boolean => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Classic
  );

  const {
    application: { capabilities },
  } = useKibana().services;

  const hasAgentBuilderAccess = capabilities?.agentBuilder?.show === true;

  return chatExperience === AIChatExperience.Agent && hasAgentBuilderAccess;
};
