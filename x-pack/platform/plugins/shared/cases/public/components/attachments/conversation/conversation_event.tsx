/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { UserActionTitle } from '@kbn/cases-components';
import type { ConversationAttachmentMetadata } from '../../../../common/types/domain_zod/attachment/conversation/v2';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
import { useKibana } from '../../../common/lib/kibana';
import { useConversationAttachmentOpenedEBT } from '../../../analytics/use_conversation_attachment_ebt';
import { openConversationInChat } from '../../../agent_builder/open_conversation_in_chat';
import { getConversationHref } from './helpers';
import * as i18n from './translations';

export type ConversationViewProps = UnifiedReferenceAttachmentViewProps<
  ConversationAttachmentMetadata,
  string
>;

const ConversationEventComponent: React.FC<ConversationViewProps> = ({
  attachmentId,
  metadata,
}) => {
  const {
    services: { agentBuilder, application },
  } = useKibana();
  const trackOpened = useConversationAttachmentOpenedEBT();
  const agentId = metadata?.agentId;

  const onClick = useCallback(() => {
    trackOpened('chat');
    openConversationInChat(agentBuilder, { conversationId: attachmentId, agentId });
  }, [agentBuilder, attachmentId, agentId, trackOpened]);

  // The href keeps Cmd/Ctrl+click and "open in new tab" working for the full page.
  const getHref = useCallback(
    () =>
      agentId
        ? getConversationHref(application, { agentId, conversationId: attachmentId })
        : undefined,
    [application, agentId, attachmentId]
  );

  return (
    <UserActionTitle
      label={i18n.ADDED_CONVERSATION}
      link={{
        targetId: attachmentId,
        label: metadata?.title || i18n.UNTITLED_CONVERSATION,
        onClick,
        getHref,
        dataTestSubj: `cases-conversation-event-link-${attachmentId}`,
      }}
      dataTestSubj={`cases-conversation-event-${attachmentId}`}
    />
  );
};

ConversationEventComponent.displayName = 'ConversationEvent';

export const ConversationEvent = React.memo(ConversationEventComponent);
