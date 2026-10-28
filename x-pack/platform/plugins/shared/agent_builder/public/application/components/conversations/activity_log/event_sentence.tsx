/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  ConversationAccessControlMode,
  ConversationActivityEventType,
  TimelineEventType,
  type ActivityEvent,
} from '@kbn/agent-builder-common';

const visibilityLabels: Record<ConversationAccessControlMode, string> = {
  [ConversationAccessControlMode.Private]: i18n.translate(
    'xpack.agentBuilder.activityLog.visibilityPrivate',
    { defaultMessage: 'Private' }
  ),
  [ConversationAccessControlMode.Public]: i18n.translate(
    'xpack.agentBuilder.activityLog.visibilityPublic',
    { defaultMessage: 'Public' }
  ),
};

const Highlight = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        color: ${euiTheme.colors.textHeading};
        font-weight: ${euiTheme.font.weight.semiBold};
      `}
    >
      {children}
    </span>
  );
};

const UserCount = ({ count }: { count: number }) => (
  <Highlight>
    <FormattedMessage
      id="xpack.agentBuilder.activityLog.userCount"
      defaultMessage="{count, plural, one {# user} other {# users}}"
      values={{ count }}
    />
  </Highlight>
);

interface EventSentenceProps {
  event: ActivityEvent;
  actor: React.ReactNode;
  templateName?: string;
}

export const EventSentence: React.FC<EventSentenceProps> = ({ event, actor, templateName }) => {
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
          defaultMessage="{actor} added {users}"
          values={{
            actor: actorNode,
            users: <UserCount count={event.data.participants.length} />,
          }}
        />
      );
    case ConversationActivityEventType.participantsRemoved:
      return (
        <FormattedMessage
          id="xpack.agentBuilder.activityLog.participantsRemoved"
          defaultMessage="{actor} removed {users}"
          values={{
            actor: actorNode,
            users: <UserCount count={event.data.participants.length} />,
          }}
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
