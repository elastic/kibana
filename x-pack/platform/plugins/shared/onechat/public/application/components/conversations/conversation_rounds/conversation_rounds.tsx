/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { RoundLayout } from './round_layout';

const CONVERSATION_ROUNDS_ID = 'onechatConversationRoundsContainer';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { isResponseLoading, error } = useSendMessage();

  const conversationRounds = useConversationRounds();

  return (
    <EuiFlexGroup
      id={CONVERSATION_ROUNDS_ID}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.onechat.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {conversationRounds.map((round, index) => {
        const isCurrentRound = index === conversationRounds.length - 1;

        return (
          <RoundLayout
            key={index}
            hasError={Boolean(error) && isCurrentRound}
            scrollContainerHeight={scrollContainerHeight}
            isResponseLoading={isResponseLoading}
            isCurrentRound={isCurrentRound}
            rawRound={round}
          />
        );
      })}
    </EuiFlexGroup>
  );
};
