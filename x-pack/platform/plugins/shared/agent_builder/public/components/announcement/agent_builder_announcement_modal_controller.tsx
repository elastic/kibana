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
import { useGlobalUiSetting, useKibana } from '@kbn/kibana-react-plugin/public';
import {
  HIDE_ANNOUNCEMENTS_ID,
  AGENT_BUILDER_ANNOUNCEMENT_MODAL_SEEN_ID,
  SECURITY_AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AgentBuilderAnnouncementModal } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

export function AgentBuilderAnnouncementModalController() {
  const { services } = useKibana<{
    spaces?: SpacesPluginStart;
    analytics: AnalyticsServiceStart;
    application: ApplicationStart;
    settings: { client: IUiSettingsClient; globalClient: IUiSettingsClient };
  }>();
  const hideAnnouncements = useGlobalUiSetting<boolean>(HIDE_ANNOUNCEMENTS_ID);
  const spacesService = services.spaces;
  const activeSpace$ = useMemo(() => spacesService?.getActiveSpace$() ?? EMPTY, [spacesService]);
  const space = useObservable(activeSpace$);
  const announcementSeen =
    services.settings?.client.get<boolean>(AGENT_BUILDER_ANNOUNCEMENT_MODAL_SEEN_ID) ?? true;
  const securityChatExperience =
    services.settings?.client.get<AIChatExperience>(SECURITY_AI_CHAT_EXPERIENCE_TYPE) ??
    AIChatExperience.Agent;
  const [isDismissed, setIsDismissed] = useState(false);

  if (!space) return null;
  // Only show the announcement for security users in Agent mode — not globally for all agent users.
  if (securityChatExperience !== AIChatExperience.Agent) return null;
  if (hideAnnouncements || announcementSeen || isDismissed) return null;

  return (
    <AgentBuilderAnnouncementModal
      onContinue={() => {
        services.settings?.client
          .set(AGENT_BUILDER_ANNOUNCEMENT_MODAL_SEEN_ID, true)
          .catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
          action: 'confirmed',
          source: 'agent_builder_nav_control',
        });
        setIsDismissed(true);
      }}
      onRevert={() => {
        services.settings?.client
          .set(AGENT_BUILDER_ANNOUNCEMENT_MODAL_SEEN_ID, true)
          .catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
          source: 'agent_builder_nav_control',
        });
        services.application.navigateToApp('management', { path: '/ai/genAiSettings' });
        setIsDismissed(true);
      }}
    />
  );
}
