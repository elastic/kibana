/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { ActivityEvent } from '@kbn/agent-builder-common';
import { EventSentence } from './event_sentence';
import { ParticipantList } from './participant_list';
import { getEventParticipants } from './to_activity_items';

const EventTimestamp = ({ value }: { value: string }) => {
  const time = moment(value).locale(i18n.getLocale());

  return (
    <>
      {i18n.translate('xpack.agentBuilder.activityLog.timestamp', {
        defaultMessage: '{date} at {time}',
        values: { date: time.format('MMM DD, YYYY'), time: time.format('HH:mm') },
      })}
    </>
  );
};

interface ActivityLogRowProps {
  event: ActivityEvent;
  actorLabel: string;
  templateName?: string;
  attachmentName?: string;
  profiles: Map<string, UserProfileWithAvatar>;
}

export const ActivityLogRow: React.FC<ActivityLogRowProps> = ({
  event,
  actorLabel,
  templateName,
  attachmentName,
  profiles,
}) => {
  const { euiTheme } = useEuiTheme();
  const participants = getEventParticipants(event);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="xs"
      responsive={false}
      css={css`
        padding-block-start: calc(
          (${euiTheme.size.xl} - ${euiTheme.size.base} - ${euiTheme.size.xs}) / 2
        );
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={css`
            color: ${euiTheme.colors.textSubdued};
          `}
        >
          <EventSentence
            event={event}
            actor={actorLabel}
            templateName={templateName}
            attachmentName={attachmentName}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          css={css`
            color: ${euiTheme.colors.textDisabled};
          `}
        >
          <EventTimestamp value={event.created_at} />
        </EuiText>
      </EuiFlexItem>
      {participants.length > 0 && (
        <EuiFlexItem
          grow={false}
          css={css`
            margin-block-start: ${euiTheme.size.m};
          `}
        >
          <ParticipantList participants={participants} profiles={profiles} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
