/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type {
  AnalyticsServiceStart,
  ApplicationStart,
  HttpStart,
  I18nStart,
  IUiSettingsClient,
  NotificationsStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import { AIChatExperience, canUserChangeSpaceChatExperience } from '@kbn/ai-assistant-common';
import { useGlobalUiSetting, useKibana } from '@kbn/kibana-react-plugin/public';
import { AI_CHAT_EXPERIENCE_TYPE, HIDE_ANNOUNCEMENTS_ID } from '@kbn/management-settings-ids';
import { AgentBuilderAnnouncementModal } from '@kbn/agent-builder-browser';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common/telemetry';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useAgentBuilderAnnouncementModalSeenState } from './use_agent_builder_announcement_modal_seen';
import {
  computeAnnouncementVariant,
  useAiAssistantPriorUsage,
} from './use_ai_assistant_prior_usage';

interface ShowToastParams {
  notifications: NotificationsStart;
  i18nService: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileServiceStart;
  genAiSettingsUrl: string;
}

interface ShowCtaToastParams extends ShowToastParams {
  canRevertToAssistant: boolean;
}

function showRevertToast({
  notifications,
  i18nService,
  theme,
  userProfile,
  genAiSettingsUrl,
}: ShowToastParams) {
  notifications.toasts.addSuccess({
    title: i18n.translate('xpack.agentBuilder.announcement.revertToast.title', {
      defaultMessage: 'Reverted to AI Assistant',
    }),
    text: toMountPoint(
      <>
        <p>
          {i18n.translate('xpack.agentBuilder.announcement.revertToast.body', {
            defaultMessage: 'All users in this space will now use the AI Assistant.',
          })}
        </p>
        <p>
          <FormattedMessage
            id="xpack.agentBuilder.announcement.revertToast.manageLink"
            defaultMessage="Manage further changes in {link}"
            values={{
              link: (
                <EuiLink href={genAiSettingsUrl}>
                  {'GenAI '}
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {'Settings '}
                    <EuiIcon type="popout" size="s" aria-hidden="true" />
                  </span>
                </EuiLink>
              ),
            }}
          />
        </p>
      </>,
      { i18n: i18nService, theme, userProfile }
    ),
  });
}

function showCtaToast({
  notifications,
  i18nService,
  theme,
  userProfile,
  canRevertToAssistant,
  genAiSettingsUrl,
}: ShowCtaToastParams) {
  notifications.toasts.addSuccess({
    title: i18n.translate('xpack.agentBuilder.announcement.ctaToast.title', {
      defaultMessage: "You're now using AI Agent",
    }),
    ...(canRevertToAssistant && {
      text: toMountPoint(
        <>
          <p>
            {i18n.translate('xpack.agentBuilder.announcement.ctaToast.body', {
              defaultMessage: 'All users in this space will use AI Agent.',
            })}
          </p>
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.announcement.ctaToast.manageLink"
              defaultMessage="Manage further changes in {link}"
              values={{
                link: (
                  <EuiLink href={genAiSettingsUrl}>
                    {'GenAI '}
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {'Settings '}
                      <EuiIcon type="popout" size="s" aria-hidden="true" />
                    </span>
                  </EuiLink>
                ),
              }}
            />
          </p>
        </>,
        { i18n: i18nService, theme, userProfile }
      ),
    }),
  });
}

export function AgentBuilderAnnouncementModalController() {
  const { services } = useKibana<{
    spaces?: SpacesPluginStart;
    analytics: AnalyticsServiceStart;
    application: ApplicationStart;
    i18n: I18nStart;
    notifications: NotificationsStart;
    theme: ThemeServiceStart;
    userProfile: UserProfileServiceStart;
    http: HttpStart;
    settings: { client: IUiSettingsClient; globalClient: IUiSettingsClient };
  }>();
  const canRevertToAssistant = useMemo(
    () => canUserChangeSpaceChatExperience(services.application.capabilities),
    [services.application.capabilities]
  );
  const { hasUsedAiAssistant, isReady: isUsageReady } = useAiAssistantPriorUsage(
    services.http,
    services.application.capabilities
  );
  const variant = useMemo(
    () => computeAnnouncementVariant(hasUsedAiAssistant, canRevertToAssistant),
    [hasUsedAiAssistant, canRevertToAssistant]
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
  const {
    isSeen,
    isReady: isSeenStateReady,
    markSeen,
  } = useAgentBuilderAnnouncementModalSeenState(services.userProfile);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!space) return null;
  if (hideAnnouncements || isDismissed || navigator.webdriver) return null;
  if (chatExperience === AIChatExperience.Classic) return null;
  if (!isSeenStateReady || !isUsageReady) return null;
  if (isSeen) return null;

  const telemetryContext = {
    announcement_variant: variant,
    had_prior_ai_assistant_usage: hasUsedAiAssistant,
  };

  return (
    <AgentBuilderAnnouncementModal
      variant={variant}
      onContinue={() => {
        void markSeen().catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
          action: 'confirmed',
          source: 'agent_builder_nav_control',
          ...telemetryContext,
        });
        const genAiSettingsUrl = services.application.getUrlForApp('management', {
          path: '/ai/genAiSettings',
        });
        showCtaToast({
          notifications: services.notifications,
          i18nService: services.i18n,
          theme: services.theme,
          userProfile: services.userProfile,
          canRevertToAssistant,
          genAiSettingsUrl,
        });
        setIsDismissed(true);
      }}
      onRevert={async () => {
        void markSeen().catch(() => {});
        services.analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.OptOut, {
          source: 'agent_builder_nav_control',
          ...telemetryContext,
        });
        try {
          await services.settings.client.set(AI_CHAT_EXPERIENCE_TYPE, AIChatExperience.Classic);
          const genAiSettingsUrl = services.application.getUrlForApp('management', {
            path: '/ai/genAiSettings',
          });
          showRevertToast({
            notifications: services.notifications,
            i18nService: services.i18n,
            theme: services.theme,
            userProfile: services.userProfile,
            genAiSettingsUrl,
          });
        } catch (_err) {
          // silent
        }
        setIsDismissed(true);
      }}
    />
  );
}
