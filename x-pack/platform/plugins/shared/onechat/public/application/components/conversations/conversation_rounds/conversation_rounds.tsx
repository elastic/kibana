/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useSendMessage } from '../../../context/send_message_context';
import { useConversationRounds } from '../../../hooks/use_conversation';
import { ConversationContent } from '../conversation_grid';
import { RoundError } from './round_error';
import { RoundIcon } from './round_icon';
import { RoundLayout } from './round_layout';
import { RoundResponse } from './round_response';

export const ConversationRounds: React.FC<{}> = () => {
  const conversationRounds = useConversationRounds();
  const { isResponseLoading, retry, error } = useSendMessage();
  return (
    <ConversationContent>
      <EuiFlexGroup
        direction="column"
        gutterSize="l"
        aria-label={i18n.translate('xpack.onechat.conversationRounds', {
          defaultMessage: 'Conversation messages',
        })}
      >
        {conversationRounds.map(({ input, response, steps }, index) => {
          const isCurrentRound = index === conversationRounds.length - 1;
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
                  <RoundError error={error} onRetry={retry} />
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
