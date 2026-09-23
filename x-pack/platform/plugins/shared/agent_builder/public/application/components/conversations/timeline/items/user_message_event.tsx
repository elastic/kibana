/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  UserMessageEvent as UserMessageEventData,
  ConversationRoundAuthor,
  VersionedAttachment,
} from '@kbn/agent-builder-common';
import { RoundInput } from '../../conversation_rounds/round_input';

interface UserMessageEventProps {
  event: UserMessageEventData;
  isPending?: boolean;
  conversationAttachments?: VersionedAttachment[];
}

const toRoundAuthor = (actor: UserMessageEventData['actor']): ConversationRoundAuthor => ({
  id: actor.id,
  username: actor.username,
  full_name: actor.full_name,
});

export const UserMessageEvent: React.FC<UserMessageEventProps> = ({
  event,
  isPending = false,
  conversationAttachments,
}) => {
  return (
    <RoundInput
      input={event.data.message}
      startedAt={event.created_at}
      author={isPending ? undefined : toRoundAuthor(event.actor)}
      origin={event.actor.origin}
      isPendingCurrentRound={isPending}
      attachmentRefs={event.data.attachment_refs}
      fallbackAttachments={event.data.attachments}
      conversationAttachments={conversationAttachments}
    />
  );
};
