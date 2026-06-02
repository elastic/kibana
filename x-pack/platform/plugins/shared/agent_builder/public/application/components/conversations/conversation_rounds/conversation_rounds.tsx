/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useConversation, useConversationRoundEntries } from '../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAttachmentLifecycle } from '../../../hooks/use_attachment_lifecycle';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { RoundLayout } from './round_layout';

const CONVERSATION_ROUNDS_ID = 'agentBuilderConversationRoundsContainer';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { conversation } = useConversation();
  const conversationRoundEntries = useConversationRoundEntries();
  const { attachmentsService } = useAgentBuilderServices();
  const { conversationActions } = useConversationContext();

  useAttachmentLifecycle({
    attachments: conversation?.attachments,
    conversationId: conversation?.id,
    attachmentsService,
    invalidateConversation: conversationActions.invalidateConversation,
  });

  return (
    <EuiFlexGroup
      id={CONVERSATION_ROUNDS_ID}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.agentBuilder.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {conversationRoundEntries.map(({ round, author }, index) => {
        const isCurrentRound = index === conversationRoundEntries.length - 1;

        return (
          <RoundLayout
            key={index}
            scrollContainerHeight={scrollContainerHeight}
            isCurrentRound={isCurrentRound}
            rawRound={round}
            author={author}
            conversationId={conversation?.id}
            conversationAttachments={conversation?.attachments}
            allRounds={conversationRoundEntries.map(({ round: r }) => r)}
            roundIndex={index}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
