/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React, { useEffect, useState } from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { AIChatExperience } from '@kbn/ai-assistant-common/src/types/chat_experience';
import { AI_ASSISTANT_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import type { OnechatStartDependencies } from '../../types';
import type { OnechatPluginStart } from '../../types';

const LazyOnechatNavControlWithProvider = dynamic(() =>
  import('./onechat_nav_control_with_provider').then((m) => ({
    default: m.OnechatNavControlWithProvider,
  }))
);

interface OnechatNavControlInitiatorProps {
  coreStart: CoreStart;
  pluginsStart: OnechatStartDependencies;
  onechatService: OnechatPluginStart;
}

export const OnechatNavControlInitiator = ({
  coreStart,
  pluginsStart,
  onechatService,
}: OnechatNavControlInitiatorProps) => {
  const [isAgentsExperience, setIsAgentsExperience] = useState(false);

  // Subscribe to chat experience setting from core settings
  // This keeps all nav controls in sync when the chat experience changes
  useEffect(() => {
    const sub = coreStart.settings.client
      .get$<AIChatExperience>(AI_ASSISTANT_CHAT_EXPERIENCE_TYPE, AIChatExperience.Classic)
      .subscribe((chatExperience) => {
        setIsAgentsExperience(chatExperience === AIChatExperience.Agents);
      });

    return () => {
      sub.unsubscribe();
    };
  }, [coreStart.settings.client]);

  if (!isAgentsExperience) {
    return null;
  }
  return (
    <LazyOnechatNavControlWithProvider
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      onechatService={onechatService}
    />
  );
};
