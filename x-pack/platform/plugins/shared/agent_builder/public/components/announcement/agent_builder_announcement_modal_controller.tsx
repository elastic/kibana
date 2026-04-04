/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type { AnalyticsServiceStart, ApplicationStart } from '@kbn/core/public';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import { HIDE_ANNOUNCEMENTS_ID } from '@kbn/management-settings-ids';
import {
  AgentBuilderAnnouncementModal,
  getAgentBuilderAnnouncementState,
} from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';

/** While active space is not yet available, do not flash the modal (treat as already handled). */
const PENDING_SPACE_FALLBACK = { hasSeenModal: true, markAsSeen: () => {} };

export function AgentBuilderAnnouncementModalController() {
  const { services } = useKibana<{
    spaces?: SpacesPluginStart;
    analytics: AnalyticsServiceStart;
    application: ApplicationStart;
  }>();
  const hideAnnouncements = useUiSetting<boolean>(HIDE_ANNOUNCEMENTS_ID);
  const spacesService = services.spaces;
  const activeSpace$ = useMemo(() => spacesService?.getActiveSpace$() ?? EMPTY, [spacesService]);
  const space = useObservable(activeSpace$);
  const { hasSeenModal, markAsSeen } = useMemo(
    () => (space ? getAgentBuilderAnnouncementState(space.id) : PENDING_SPACE_FALLBACK),
    [space]
  );
  const [isDismissed, setIsDismissed] = useState(false);

  if (hideAnnouncements || hasSeenModal || isDismissed) return null;

  return (
    <AgentBuilderAnnouncementModal
      onContinue={() => {
        markAsSeen();
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
          action: 'confirmed',
          source: 'agent_builder_nav_control',
        });
        setIsDismissed(true);
      }}
      onRevert={() => {
        markAsSeen();
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
          source: 'agent_builder_nav_control',
        });
        services.application.navigateToApp('management', { path: '/ai/genAiSettings' });
        setIsDismissed(true);
      }}
    />
  );
}
