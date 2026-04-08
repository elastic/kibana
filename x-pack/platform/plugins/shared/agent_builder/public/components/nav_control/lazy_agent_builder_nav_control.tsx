/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import React, { useEffect, useState } from 'react';
import { combineLatest, of, switchMap } from 'rxjs';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import {
  AI_CHAT_EXPERIENCE_TYPE,
  SECURITY_AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import type { AgentBuilderStartDependencies } from '../../types';
import type { AgentBuilderPluginStart } from '../../types';

const LazyAgentBuilderNavControlWithProvider = dynamic(() =>
  import('./agent_builder_nav_control_with_provider').then((m) => ({
    default: m.AgentBuilderNavControlWithProvider,
  }))
);

interface AgentBuilderNavControlInitiatorProps {
  coreStart: CoreStart;
  pluginsStart: AgentBuilderStartDependencies;
  agentBuilderService: AgentBuilderPluginStart;
}

export const AgentBuilderNavControlInitiator = ({
  coreStart,
  pluginsStart,
  agentBuilderService,
}: AgentBuilderNavControlInitiatorProps) => {
  const [isAgentsExperience, setIsAgentsExperience] = useState(false);

  useEffect(() => {
    const space$ = pluginsStart.spaces?.getActiveSpace$() ?? of(null);

    const sub = combineLatest([
      space$,
      coreStart.application.currentAppId$,
      coreStart.application.applications$,
    ])
      .pipe(
        switchMap(([space, appId, apps]) => {
          const appCategory = apps.get(appId ?? '')?.category?.id;
          // Security solution spaces or any app in the security category use the security-scoped
          // setting; all other contexts use the global setting.
          const isSecurityContext =
            space?.solution === 'security' || appCategory === DEFAULT_APP_CATEGORIES.security.id;
          const settingKey = isSecurityContext
            ? SECURITY_AI_CHAT_EXPERIENCE_TYPE
            : AI_CHAT_EXPERIENCE_TYPE;
          return coreStart.settings.client.get$<AIChatExperience>(settingKey);
        })
      )
      .subscribe((chatExperience) => {
        setIsAgentsExperience(chatExperience === AIChatExperience.Agent);
      });

    return () => {
      sub.unsubscribe();
    };
  }, [coreStart.application, coreStart.settings.client, pluginsStart.spaces]);

  if (!isAgentsExperience) {
    return null;
  }
  return (
    <LazyAgentBuilderNavControlWithProvider
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      agentBuilderService={agentBuilderService}
    />
  );
};
