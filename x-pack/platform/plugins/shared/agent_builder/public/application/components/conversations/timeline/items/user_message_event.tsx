/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  UserMessageEvent as UserMessageEventData,
  ConversationRoundAuthor,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import { UserMessage } from '../user_message/user_message';
import type { SteerState } from '../types';

interface UserMessageEventProps {
  event: UserMessageEventData;
  isPending?: boolean;
  steerState?: SteerState;
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
}

const steerLabels: Record<SteerState, string> = {
  waiting: i18n.translate('xpack.agentBuilder.conversation.steer.waiting', {
    defaultMessage: 'Waiting for the agent',
  }),
  read_by_unfinished: i18n.translate('xpack.agentBuilder.conversation.steer.readByUnfinished', {
    defaultMessage: 'Read by a run that did not finish; will be read again',
  }),
  before_pause: i18n.translate('xpack.agentBuilder.conversation.steer.beforePause', {
    defaultMessage: 'Will be read after you answer the prompt',
  }),
};

const toRoundAuthor = (actor: UserMessageEventData['actor']): ConversationRoundAuthor => ({
  id: actor.id,
  username: actor.username,
  full_name: actor.full_name,
});

const UserMessageEventComponent: React.FC<UserMessageEventProps> = ({
  event,
  isPending = false,
  steerState,
  attachmentRefs,
  conversationAttachments,
}) => {
  return (
    <>
      <UserMessage
        input={event.data.message}
        startedAt={event.created_at}
        author={isPending ? undefined : toRoundAuthor(event.actor)}
        origin={event.actor.origin}
        isPendingCurrentRound={isPending}
        attachmentRefs={attachmentRefs}
        fallbackAttachments={event.data.attachments}
        conversationAttachments={conversationAttachments}
      />
      {steerState && (
        <EuiText
          size="xs"
          color="subdued"
          textAlign="right"
          data-test-subj={`agentBuilderSteerState-${steerState}`}
        >
          {steerLabels[steerState]}
        </EuiText>
      )}
    </>
  );
};

export const UserMessageEvent = React.memo(UserMessageEventComponent);
UserMessageEvent.displayName = 'UserMessageEvent';
