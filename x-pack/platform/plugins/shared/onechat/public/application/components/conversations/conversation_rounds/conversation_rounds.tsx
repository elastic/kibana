/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { RoundError } from './round_error';
import { RoundIcon } from './round_icon';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response';
import { conversationRoundsId } from './conversation_rounds.styles';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { isResponseLoading, retry, error } = useSendMessage();

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
        const { input, response, steps } = round;
        const isCurrentRound = index === conversationRounds.length - 1;
        const isLoading = isResponseLoading && isCurrentRound;
        const isError = Boolean(error) && isCurrentRound;
        const isAborted = round.status === 'aborted';

        return (
          <RoundLayout
            key={index}
            scrollContainerHeight={scrollContainerHeight}
            // TODO: eventually we will use a RoundInput component when we have more complicated inputs like file attachments
            input={
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="s">{input.message}</EuiText>
                </EuiFlexItem>
                {isAborted && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      {i18n.translate('xpack.onechat.round.abortedBadge', {
                        defaultMessage: 'Aborted',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
            isResponseLoading={isResponseLoading}
            isCurrentRound={isCurrentRound}
            outputIcon={<RoundIcon isLoading={isLoading} isError={isError} />}
            output={
              isError ? (
                <RoundError error={error} onRetry={retry} />
              ) : isAborted ? (
                <EuiText color="subdued" size="s" data-test-subj="abortedRoundMessage">
                  {i18n.translate('xpack.onechat.round.abortedMessage', {
                    defaultMessage: 'This request was aborted.',
                  })}
                </EuiText>
              ) : (
                <RoundResponse
                  rawRound={round}
                  response={response}
                  steps={steps}
                  isLoading={isLoading}
                />
              )
            }
          />
        );
      })}
    </EuiFlexGroup>
  );
};
