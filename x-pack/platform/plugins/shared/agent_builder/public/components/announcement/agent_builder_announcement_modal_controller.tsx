/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type { AnalyticsServiceStart, ApplicationStart, IUiSettingsClient } from '@kbn/core/public';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import { AIChatExperience, canUserChangeSpaceChatExperience } from '@kbn/ai-assistant-common';
import { useGlobalUiSetting, useKibana } from '@kbn/kibana-react-plugin/public';
import { AI_CHAT_EXPERIENCE_TYPE, HIDE_ANNOUNCEMENTS_ID } from '@kbn/management-settings-ids';
import { AgentBuilderAnnouncementModal } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useAgentBuilderAnnouncementModalSeenState } from './use_agent_builder_announcement_modal_seen';

export function AgentBuilderAnnouncementModalController() {
  const { services } = useKibana<{
    spaces?: SpacesPluginStart;
    analytics: AnalyticsServiceStart;
    application: ApplicationStart;
    userProfile: UserProfileServiceStart;
    settings: { client: IUiSettingsClient; globalClient: IUiSettingsClient };
  }>();
  const canRevertToAssistant = useMemo(
    () => canUserChangeSpaceChatExperience(services.application.capabilities),
    [services.application.capabilities]
  );
  const hideAnnouncements = useGlobalUiSetting<boolean>(HIDE_ANNOUNCEMENTS_ID);
  const spacesService = services.spaces;
  const activeSpace$ = useMemo(() => spacesService?.getActiveSpace$() ?? EMPTY, [spacesService]);
  const space = useObservable(activeSpace$);
  const chatExperience = useObservable(
    useMemo(
      () => services.settings.client.get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE),
      [services.settings.client]
    )
  );
  const { isSeen, isReady, markSeen } = useAgentBuilderAnnouncementModalSeenState(
    services.userProfile,
    space?.id
  );
  const [isDismissed, setIsDismissed] = useState(false);

  if (!space) return null;
  if (hideAnnouncements || isDismissed || navigator.webdriver) return null;
  if (chatExperience === AIChatExperience.Classic) return null;
  if (!isReady) return null;
  if (isSeen) return null;

  return (
    <AgentBuilderAnnouncementModal
      canRevertToAssistant={canRevertToAssistant}
      onContinue={() => {
        void markSeen().catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
          action: 'confirmed',
          source: 'agent_builder_nav_control',
        });
        setIsDismissed(true);
      }}
      onRevert={() => {
        void markSeen().catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
          source: 'agent_builder_nav_control',
        });
        services.application.navigateToApp('management', { path: '/ai/genAiSettings' });
        setIsDismissed(true);
      }}
    />
  );
}
