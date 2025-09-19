/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { isEmpty } from 'lodash';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';

import type { EventAttachment } from '../../../../common/types/domain';
import type { UserActionBuilder, UserActionBuilderArgs } from '../types';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { HoverableUserWithAvatarResolver } from '../../user_profiles/hoverable_user_with_avatar_resolver';
import { UserActionContentToolbar } from '../content_toolbar';
import { DELETE_EVENTS_SUCCESS_TITLE } from './translations';

import * as i18n from '../translations';
import { UserActionShowEvent } from './show_event';
import { EventPropertyActions } from '../property_actions/event_property_actions';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  'userAction' | 'onShowAlertDetails' | 'userProfiles' | 'handleDeleteComment' | 'loadingCommentIds'
> & { attachment: SnakeToCamelCase<EventAttachment> };

const getSingleEventUserAction = ({
  userAction,
  userProfiles,
  attachment,
  loadingCommentIds,
  onShowAlertDetails,
  handleDeleteComment,
}: BuilderArgs): EuiCommentProps[] => {
  const eventId = getNonEmptyField(attachment.eventId);
  const eventIndex = getNonEmptyField(attachment.index);

  if (!eventId || !eventIndex) {
    return [];
  }

  return [
    {
      username: (
        <HoverableUserWithAvatarResolver user={userAction.createdBy} userProfiles={userProfiles} />
      ),
      eventColor: 'subdued',
      event: <SingleEventCommentEvent actionId={userAction.id} />,
      'data-test-subj': `user-action-event-${userAction.type}-${userAction.action}-action-${userAction.id}`,
      timestamp: <UserActionTimestamp createdAt={userAction.createdAt} />,
      timelineAvatar: 'bell',
      actions: (
        <UserActionContentToolbar id={attachment.id}>
          <EuiFlexItem grow={false}>
            <UserActionShowEvent
              id={userAction.id}
              eventId={eventId}
              index={eventIndex}
              onShowEventDetails={onShowAlertDetails}
            />
          </EuiFlexItem>
          <EventPropertyActions
            onDelete={() => handleDeleteComment(attachment.id, DELETE_EVENTS_SUCCESS_TITLE(1))}
            isLoading={loadingCommentIds.includes(attachment.id)}
            totalEvents={1}
          />
        </UserActionContentToolbar>
      ),
    },
  ];
};

export const createEventAttachmentUserActionBuilder = (
  params: BuilderArgs
): ReturnType<UserActionBuilder> => ({
  build: () => {
    return getSingleEventUserAction(params);
  },
});

const getFirstItem = (items?: string | string[] | null): string | null => {
  return Array.isArray(items) ? items[0] : items ?? null;
};

function getNonEmptyField(field: string | string[] | undefined | null): string | null {
  const firstItem = getFirstItem(field);
  if (firstItem == null || isEmpty(firstItem)) {
    return null;
  }

  return firstItem;
}
interface SingleEventProps {
  actionId: string;
}

interface MultipleEventsProps extends SingleEventProps {
  totalEvents: number;
}
const MultipleEventsCommentEventComponent: React.FC<MultipleEventsProps> = ({
  actionId,
  totalEvents,
}) => {
  return (
    <span data-test-subj={`multiple-events-user-action-${actionId}`}>
      {i18n.MULTIPLE_EVENTS_COMMENT_LABEL_TITLE(totalEvents)}
    </span>
  );
};

MultipleEventsCommentEventComponent.displayName = 'MultipleEventsCommentEvent';
export const MultipleEventsCommentEvent = memo(MultipleEventsCommentEventComponent);

const SingleEventCommentEventComponent: React.FC<SingleEventProps> = ({ actionId }) => {
  return (
    <span data-test-subj={`single-event-user-action-${actionId}`}>
      {i18n.EVENT_COMMENT_LABEL_TITLE}
    </span>
  );
};

SingleEventCommentEventComponent.displayName = 'SingleEventCommentEvent';

export const SingleEventCommentEvent = memo(SingleEventCommentEventComponent);
