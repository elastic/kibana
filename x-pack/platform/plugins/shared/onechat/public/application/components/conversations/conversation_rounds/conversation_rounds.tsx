/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationRound } from '@kbn/onechat-common';
import React from 'react';
import { ConversationContent } from '../conversation_grid';
import { RoundError } from './round_error';
import { RoundIcon } from './round_icon';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response';

interface ConversationRoundsProps {
  rounds: ConversationRound[];
  isResponseLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

export const ConversationRounds: React.FC<ConversationRoundsProps> = ({
  rounds,
  isResponseLoading,
  error,
  onRetry,
}) => {
  return (
    <ConversationContent>
      <EuiFlexGroup
        direction="column"
        gutterSize="l"
        aria-label={i18n.translate('xpack.onechat.conversationRounds', {
          defaultMessage: 'Conversation messages',
        })}
      >
        {rounds.map(({ input, response, steps }, index) => {
          const isCurrentRound = index === rounds.length - 1;
          const isLoading = isResponseLoading && isCurrentRound;
          const isError = Boolean(error) && isCurrentRound;
          return (
            <RoundLayout
              key={index}
              // TODO: eventually we will use a RoundInput component when we have more complicated inputs like file attachments
              input={<EuiText size="s">{input.message}</EuiText>}
              outputIcon={<RoundIcon isLoading={isLoading} isError={isError} />}
              output={
                isError ? (
                  <RoundError error={error} onRetry={onRetry} />
                ) : (
                  <RoundResponse response={response} steps={steps} isLoading={isLoading} />
                )
              }
            />
          );
        })}
      </EuiFlexGroup>
    </ConversationContent>
  );
};
