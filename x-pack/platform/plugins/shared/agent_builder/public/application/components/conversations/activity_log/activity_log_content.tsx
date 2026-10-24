/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonText,
  EuiText,
  EuiTextColor,
  EuiTimeline,
  type EuiTimelineItemProps,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  ConversationAccessControlMode,
  ConversationActivityEventType,
  EventActorType,
  TimelineEventType,
  type ActivityEvent,
  type ConversationParticipant,
  type EventActor,
} from '@kbn/agent-builder-common';
import { useConversation } from '../../../hooks/use_conversation';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../hooks/use_kibana';
import {
  findTriggeringUser,
  getTemplateDisplayName,
  resolveTimeZone,
  toActivityItems,
} from './to_activity_items';

const COLLAPSED_PARTICIPANTS = 5;

const labels = {
  title: i18n.translate('xpack.agentBuilder.activityLog.title', {
    defaultMessage: 'Activity log',
  }),
  emptyTitle: i18n.translate('xpack.agentBuilder.activityLog.emptyTitle', {
    defaultMessage: 'No activity yet',
  }),
  unknownUser: i18n.translate('xpack.agentBuilder.activityLog.unknownUser', {
    defaultMessage: 'Unknown user',
  }),
  showLess: i18n.translate('xpack.agentBuilder.activityLog.showLess', {
    defaultMessage: 'Show less',
  }),
  private: i18n.translate('xpack.agentBuilder.activityLog.visibilityPrivate', {
    defaultMessage: 'Private',
  }),
  public: i18n.translate('xpack.agentBuilder.activityLog.visibilityPublic', {
    defaultMessage: 'Public',
  }),
};

const visibilityLabels: Record<ConversationAccessControlMode, string> = {
  [ConversationAccessControlMode.Private]: labels.private,
  [ConversationAccessControlMode.Public]: labels.public,
};

const eventIcons: Record<string, string> = {
  [ConversationActivityEventType.conversationCreated]: 'play',
  [ConversationActivityEventType.titleUpdated]: 'pencil',
  [ConversationActivityEventType.participantsAdded]: 'users',
  [ConversationActivityEventType.participantsRemoved]: 'users',
  [ConversationActivityEventType.visibilityUpdated]: 'eye',
  [TimelineEventType.attachmentAdded]: 'sparkles',
  [TimelineEventType.attachmentUpdated]: 'sparkles',
};

const participantsOf = (event: ActivityEvent): ConversationParticipant[] =>
  event.type === ConversationActivityEventType.participantsAdded ||
  event.type === ConversationActivityEventType.participantsRemoved
    ? event.data.participants
    : [];

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <EuiTextColor color="default">{children}</EuiTextColor>
);

const ParticipantList = ({
  participants,
  profiles,
}: {
  participants: ConversationParticipant[];
  profiles: Map<string, UserProfileWithAvatar>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount = participants.length - COLLAPSED_PARTICIPANTS;
  const visible =
    isExpanded || hiddenCount <= 0 ? participants : participants.slice(0, COLLAPSED_PARTICIPANTS);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false} alignItems="flexStart">
      {visible.map(({ id }) => {
        const profile = profiles.get(id);
        return (
          <EuiFlexItem key={id} grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {profile && (
                <EuiFlexItem grow={false}>
                  <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {profile ? getUserDisplayName(profile.user) : labels.unknownUser}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
      {hiddenCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            data-test-subj="agentBuilderActivityLogToggleParticipants"
          >
            {isExpanded ? (
              labels.showLess
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.activityLog.showMore"
                defaultMessage="Show {count} more"
                values={{ count: hiddenCount }}
              />
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const EventSentence = ({
  event,
  actor,
  templateName,
}: {
  event: ActivityEvent;
  actor: React.ReactNode;
  templateName?: string;
}): React.ReactElement | null => {
  const actorNode = <Highlight>{actor}</Highlight>;

  switch (event.type) {
    case ConversationActivityEventType.conversationCreated:
      return templateName ? (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.conversationCreatedFromTemplate"
          defaultMessage="{actor} created this chat from {template}"
          values={{ actor: actorNode, template: <Highlight>{templateName}</Highlight> }}
        />
      ) : (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.conversationCreated"
          defaultMessage="{actor} created this chat"
          values={{ actor: actorNode }}
        />
      );
    case ConversationActivityEventType.titleUpdated:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.titleUpdated"
          defaultMessage="{actor} changed the title of the chat to {title}"
          values={{ actor: actorNode, title: <Highlight>{event.data.title}</Highlight> }}
        />
      );
    case ConversationActivityEventType.participantsAdded:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.participantsAdded"
          defaultMessage="{actor} added {count, plural, one {# user} other {# users}}"
          values={{ actor: actorNode, count: event.data.participants.length }}
        />
      );
    case ConversationActivityEventType.participantsRemoved:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.participantsRemoved"
          defaultMessage="{actor} removed {count, plural, one {# user} other {# users}}"
          values={{ actor: actorNode, count: event.data.participants.length }}
        />
      );
    case ConversationActivityEventType.visibilityUpdated:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.visibilityUpdated"
          defaultMessage="{actor} changed visibility from {previous} to {current}"
          values={{
            actor: actorNode,
            previous: <Highlight>{visibilityLabels[event.data.previous_access_mode]}</Highlight>,
            current: <Highlight>{visibilityLabels[event.data.access_mode]}</Highlight>,
          }}
        />
      );
    case TimelineEventType.attachmentAdded:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.attachmentAdded"
          defaultMessage="{actor} added attachment {attachment}"
          values={{
            actor: actorNode,
            attachment: <Highlight>{event.data.attachment_type}</Highlight>,
          }}
        />
      );
    case TimelineEventType.attachmentUpdated:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.attachmentUpdated"
          defaultMessage="{actor} updated attachment {attachment}"
          values={{
            actor: actorNode,
            attachment: <Highlight>{event.data.attachment_type}</Highlight>,
          }}
        />
      );
    default:
      return null;
  }
};

const EventTimestamp = ({ value, timeZone }: { value: string; timeZone?: string }) => (
  <FormattedMessage
    id="xpack.agentBuilder.activityLog.timestamp"
    defaultMessage="{date} at {time}"
    values={{
      date: (
        <FormattedDate
          value={value}
          month="short"
          day="2-digit"
          year="numeric"
          timeZone={timeZone}
        />
      ),
      time: (
        <FormattedTime
          value={value}
          hour="2-digit"
          minute="2-digit"
          hourCycle="h23"
          timeZone={timeZone}
        />
      ),
    }}
  />
);

export const activityLogTitle = labels.title;

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
        ...participantsOf(event).map(({ id }) => id),
        ...(triggeringUser ? [triggeringUser.id] : []),
      ]),
    [rows]
  );
  const { data: profileList, isInitialLoading } = useUserProfiles({ uids });
  const knownProfilesRef = useRef(new Map<string, UserProfileWithAvatar>());
  const profiles = useMemo(() => {
    profileList?.forEach((profile) => knownProfilesRef.current.set(profile.uid, profile));
    return new Map(knownProfilesRef.current);
  }, [profileList]);
  const isLoadingProfiles = isInitialLoading && profiles.size === 0;

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
      const participants = participantsOf(event);
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
        icon: eventIcons[event.type] ?? 'dot',
        children: (
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <EventSentence
                  event={event}
                  actor={actorLabel(event, triggeringUser)}
                  templateName={templateName}
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="disabled">
                <EventTimestamp value={event.created_at} timeZone={timeZone} />
              </EuiText>
            </EuiFlexItem>
            {participants.length > 0 && (
              <EuiFlexItem grow={false}>
                <ParticipantList participants={participants} profiles={profiles} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      };
    });
  }, [rows, profiles, agentNames, conversationTemplatesService, timeZone]);

  if (isLoadingProfiles) {
    return <EuiSkeletonText lines={6} data-test-subj="agentBuilderActivityLogLoading" />;
  }

  if (items.length === 0) {
    return <EuiEmptyPrompt iconType="timeline" title={<h3>{labels.emptyTitle}</h3>} />;
  }

  return (
    <EuiTimeline items={items} gutterSize="l" data-test-subj="agentBuilderActivityLogTimeline" />
  );
};
