/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiEmptyPrompt,
  EuiSkeletonText,
  EuiTimeline,
  type EuiTimelineItemProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getUserDisplayName } from '@kbn/user-profile-components';
import {
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  type ActivityEvent,
  type EventActor,
} from '@kbn/agent-builder-common';
import { useConversation } from '../../../hooks/use_conversation';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../hooks/use_kibana';
import { ActivityLogRow } from './activity_log_row';
import {
  findTriggeringUser,
  getEventParticipants,
  getTemplateDisplayName,
  resolveTimeZone,
  toActivityItems,
} from './to_activity_items';

const emptyTitle = i18n.translate('xpack.agentBuilder.activityLog.emptyTitle', {
  defaultMessage: 'No activity yet',
});

const EVENT_ICONS: Record<string, string> = {
  [ConversationActivityEventType.conversationCreated]: 'play',
  [ConversationActivityEventType.titleUpdated]: 'pencil',
  [ConversationActivityEventType.participantsAdded]: 'users',
  [ConversationActivityEventType.participantsRemoved]: 'users',
  [ConversationActivityEventType.visibilityUpdated]: 'eye',
  [TimelineEventType.attachmentAdded]: 'sparkles',
  [TimelineEventType.attachmentUpdated]: 'sparkles',
};

export const ActivityLogContent: React.FC = () => {
  const { conversation } = useConversation();
  const { conversationTemplatesService } = useAgentBuilderServices();
  const {
    services: { settings },
  } = useKibana();

  const allEvents = conversation?.events;
  const rows = useMemo(
    () =>
      toActivityItems(allEvents).map((event) => ({
        event,
        triggeringUser: findTriggeringUser(event, allEvents),
      })),
    [allEvents]
  );
  const { agents } = useAgentBuilderAgents({ includeHidden: true });

  const timeZone = resolveTimeZone(settings?.client.get<string>('dateFormat:tz'));
  const agentNames = useMemo(() => new Map(agents.map(({ id, name }) => [id, name])), [agents]);

  const uids = useMemo(
    () =>
      rows.flatMap(({ event, triggeringUser }) => [
        ...(event.actor.type === EventActorType.user ? [event.actor.id] : []),
        ...getEventParticipants(event).map(({ id }) => id),
        ...(triggeringUser ? [triggeringUser.id] : []),
      ]),
    [rows]
  );
  const { data: profileList = [], isInitialLoading } = useUserProfiles({
    uids,
    keepPreviousData: true,
  });
  const profiles = useMemo(
    () => new Map(profileList.map((profile) => [profile.uid, profile])),
    [profileList]
  );

  const items = useMemo<EuiTimelineItemProps[]>(() => {
    const userName = ({ id, full_name: fullName, username }: EventActor): string => {
      const profile = profiles.get(id);
      return profile ? getUserDisplayName(profile.user) : fullName || username || id;
    };

    const actorLabel = ({ actor }: ActivityEvent, triggeringUser?: EventActor): string => {
      if (actor.type !== EventActorType.agent) return userName(actor);

      const agentName = agentNames.get(actor.id) ?? actor.id;
      return triggeringUser
        ? i18n.translate('xpack.agentBuilder.activityLog.viaAgent', {
            defaultMessage: '{user} (via {agent})',
            values: { user: userName(triggeringUser), agent: agentName },
          })
        : agentName;
    };

    return rows.map(({ event, triggeringUser }) => {
      const templateId =
        event.type === ConversationActivityEventType.conversationCreated
          ? event.data.template_id
          : undefined;
      const templateName = templateId
        ? getTemplateDisplayName(
            templateId,
            conversationTemplatesService.getTemplateUIDefinition(templateId)?.name
          )
        : undefined;

      return {
        key: event.id,
        icon: EVENT_ICONS[event.type] ?? 'dot',
        children: (
          <ActivityLogRow
            event={event}
            actorLabel={actorLabel(event, triggeringUser)}
            templateName={templateName}
            timeZone={timeZone}
            profiles={profiles}
          />
        ),
      };
    });
  }, [rows, profiles, agentNames, conversationTemplatesService, timeZone]);

  if (isInitialLoading) {
    return <EuiSkeletonText lines={6} data-test-subj="agentBuilderActivityLogLoading" />;
  }

  if (items.length === 0) {
    return <EuiEmptyPrompt iconType="timeline" title={<h3>{emptyTitle}</h3>} />;
  }

  return (
    <EuiTimeline items={items} gutterSize="l" data-test-subj="agentBuilderActivityLogTimeline" />
  );
};
