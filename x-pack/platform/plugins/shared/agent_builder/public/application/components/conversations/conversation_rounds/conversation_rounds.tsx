/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useConversation, useConversationRounds } from '../../../hooks/use_conversation';
import { RoundLayout } from './round_layout';

const CONVERSATION_ROUNDS_ID = 'agentBuilderConversationRoundsContainer';

interface ConversationRoundsProps {
  scrollContainerHeight: number;
  anchoredRoundIndex: number | null;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  scrollContainerHeight,
  anchoredRoundIndex,
}) => {
  const { conversation } = useConversation();
  const conversationRounds = useConversationRounds();

  // The anchored round is wrapped in a viewport-sized min-height so the user's input
  // sits at the top of the container while the response streams in below it.
  const anchorStyles = css`
    min-height: ${scrollContainerHeight}px;
  `;

  return (
    <EuiFlexGroup
      id={CONVERSATION_ROUNDS_ID}
      direction="column"
      gutterSize="l"
      aria-label={i18n.translate('xpack.agentBuilder.conversationRounds', {
        defaultMessage: 'Conversation messages',
      })}
    >
      {conversationRounds.map((round, index) => {
        const isCurrentRound = index === conversationRounds.length - 1;

        return (
          <EuiFlexItem
            key={index}
            grow={false}
            css={index === anchoredRoundIndex ? anchorStyles : undefined}
            data-test-subj="agentBuilderRoundWrapper"
          >
            <RoundLayout
              isCurrentRound={isCurrentRound}
              rawRound={round}
              conversationId={conversation?.id}
              conversationAttachments={conversation?.attachments}
              allRounds={conversationRounds}
              roundIndex={index}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
