/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ActivityEvent } from '@kbn/agent-builder-common';
import { EventSentence } from './event_sentence';
import { ParticipantList } from './participant_list';
import { getEventParticipants } from './to_activity_items';

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

interface ActivityLogRowProps {
  event: ActivityEvent;
  actorLabel: string;
  templateName?: string;
  timeZone?: string;
  profiles: Map<string, UserProfileWithAvatar>;
}

export const ActivityLogRow: React.FC<ActivityLogRowProps> = ({
  event,
  actorLabel,
  templateName,
  timeZone,
  profiles,
}) => {
  const { euiTheme } = useEuiTheme();
  const participants = getEventParticipants(event);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={css`
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <EventSentence event={event} actor={actorLabel} templateName={templateName} />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            color: ${euiTheme.colors.textDisabled};
          `}
        >
          <EventTimestamp value={event.created_at} timeZone={timeZone} />
        </EuiText>
      </EuiFlexItem>
      {participants.length > 0 && (
        <EuiFlexItem grow={false}>
          <ParticipantList participants={participants} profiles={profiles} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
