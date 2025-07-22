/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Round } from './round';
import { ConversationContent } from '../conversation_grid';
import { RoundResponse } from './round_response';
import { useConversation } from '../../../hooks/use_conversation';
import { RoundError } from './round_error';

interface ConversationRoundsProps {
  isResponseLoading: boolean;
  isResponseError: boolean;
  responseError: unknown;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  isResponseLoading,
  isResponseError,
  responseError,
}) => {
  const { conversation } = useConversation();
  const rounds = conversation?.rounds ?? [];
  return (
    <ConversationContent>
      <EuiFlexGroup
        direction="column"
        gutterSize="l"
        aria-label={i18n.translate('xpack.onechat.conversationRounds', {
          defaultMessage: 'Conversation messages',
        })}
      >
        {rounds.map((round, index) => {
          const isCurrentRound = index === rounds.length - 1;
          const isLoading = isResponseLoading && isCurrentRound;
          // TODO: enable showing RoundError once implemented
          const isError = isResponseError && isCurrentRound && false;
          return (
            <Round
              key={index}
              // TODO: eventually we will use a RoundInput component when we have more complicated inputs like file attachments
              input={<EuiText size="s">{round.input.message}</EuiText>}
              output={
                isError ? (
                  <RoundError error={responseError} />
                ) : (
                  <RoundResponse
                    response={round.response}
                    steps={round.steps}
                    isLoading={isLoading}
                  />
                )
              }
            />
          );
        })}
      </EuiFlexGroup>
    </ConversationContent>
  );
};
