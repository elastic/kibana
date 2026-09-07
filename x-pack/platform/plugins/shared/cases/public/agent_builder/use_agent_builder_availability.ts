/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useKibana } from '../common/lib/kibana';
import { useLicense } from '../common/use_license';

export interface UseAgentBuilderAvailability {
  isAgentBuilderAvailable: boolean;
  hasAgentBuilderPrivilege: boolean;
  isAgentChatExperienceEnabled: boolean;
  hasValidAgentBuilderLicense: boolean;
}

export const useAgentBuilderAvailability = (): UseAgentBuilderAvailability => {
  const [chatExperience] = useUiSetting$<AIChatExperience>(
    AI_CHAT_EXPERIENCE_TYPE,
    AIChatExperience.Agent
  );
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();
  const license = useLicense();

  return useMemo(() => {
    const agentBuilderCapabilities = capabilities.agentBuilder;
    const hasAgentBuilderPrivilege = agentBuilderCapabilities?.show === true;
    const isAgentChatExperienceEnabled = chatExperience === AIChatExperience.Agent;
    const hasValidAgentBuilderLicense = license.isAtLeastEnterprise();

    return {
      isAgentBuilderAvailable:
        hasAgentBuilderPrivilege && isAgentChatExperienceEnabled && hasValidAgentBuilderLicense,
      hasAgentBuilderPrivilege,
      isAgentChatExperienceEnabled,
      hasValidAgentBuilderLicense,
    };
  }, [capabilities, chatExperience, license]);
};
