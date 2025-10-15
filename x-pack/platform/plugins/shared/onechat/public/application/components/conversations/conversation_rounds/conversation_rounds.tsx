/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { ConversationContent } from '../conversation_grid';
import { RoundError } from './round_error';
import { RoundIcon } from './round_icon';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response';
import { conversationRoundsId } from './conversation_rounds.styles';
import { detectOAuthErrorInSteps } from '../../../utils/detect_oauth_error';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
}) => {
  const { isResponseLoading, retry, error } = useSendMessage();

  const conversationRounds = useConversationRounds();

  // Deduplicate OAuth callouts - keep only the last occurrence per provider
  const roundsToHideOAuthCallout = useMemo(() => {
    const providerLastIndex = new Map<string, number>(); // provider key -> last round index
    const hiddenRoundIndices = new Set<number>();

    // First pass: find the last occurrence of each provider
    conversationRounds.forEach((round, index) => {
      const oauthError = detectOAuthErrorInSteps(round.steps);
      if (oauthError.hasOAuthError) {
        // Create a unique key for this provider
        const providerKey = oauthError.serverId || oauthError.toolkitId || oauthError.serverName;
        if (providerKey) {
          providerLastIndex.set(providerKey, index);
        }
      }
    });

    // Second pass: mark all rounds except the last occurrence as hidden
    conversationRounds.forEach((round, index) => {
      const oauthError = detectOAuthErrorInSteps(round.steps);
      if (oauthError.hasOAuthError) {
        const providerKey = oauthError.serverId || oauthError.toolkitId || oauthError.serverName;
        if (providerKey) {
          const lastIndex = providerLastIndex.get(providerKey);
          // Hide this round's OAuth callout if it's not the last occurrence
          if (lastIndex !== undefined && index !== lastIndex) {
            hiddenRoundIndices.add(index);
          }
        }
      }
    });

    return hiddenRoundIndices;
  }, [conversationRounds]);

  return (
    <ConversationContent>
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
          const hideOAuthCallout = roundsToHideOAuthCallout.has(index);

          return (
            <RoundLayout
              key={index}
              scrollContainerHeight={scrollContainerHeight}
              // TODO: eventually we will use a RoundInput component when we have more complicated inputs like file attachments
              input={<EuiText size="s">{input.message}</EuiText>}
              isResponseLoading={isResponseLoading}
              isCurrentRound={isCurrentRound}
              outputIcon={<RoundIcon isLoading={isLoading} isError={isError} />}
              output={
                isError ? (
                  <RoundError error={error} onRetry={retry} steps={steps} />
                ) : (
                  <RoundResponse
                    rawRound={round}
                    response={response}
                    steps={steps}
                    isLoading={isLoading}
                    hideOAuthCallout={hideOAuthCallout}
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
