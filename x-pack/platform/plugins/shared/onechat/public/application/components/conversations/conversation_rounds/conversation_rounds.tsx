/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { RoundIcon } from './round_icon';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response';
import { conversationRoundsId } from './conversation_rounds.styles';
import { RoundContextProvider } from '../../../context/conversation_round/round_context';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { isResponseLoading, conversationError } = useSendMessage();

  const conversationRounds = useConversationRounds();

  return (
    <EuiFlexGroup
      id={conversationRoundsId}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.onechat.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {conversationRounds.map((round, index) => {
        const isCurrentRound = index === conversationRounds.length - 1;
        const isLoading = isResponseLoading && isCurrentRound;
        const isError = Boolean(conversationError) && isCurrentRound;

        return (
          <RoundContextProvider
            round={round}
            isLoading={isLoading}
            isError={isError}
            error={isError && (conversationError?.error ?? null)}
          >
            <RoundLayout
              key={round.id}
              scrollContainerHeight={scrollContainerHeight}
              // TODO: eventually we will use a RoundInput component when we have more complicated inputs like file attachments
              input={<EuiText size="s">{round.input.message}</EuiText>}
              isResponseLoading={isResponseLoading}
              isCurrentRound={isCurrentRound}
              outputIcon={<RoundIcon />}
              output={<RoundResponse />}
            />
          </RoundContextProvider>
        );
      })}
    </EuiFlexGroup>
  );
};
