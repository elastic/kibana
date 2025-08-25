/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AssistantResponse, ConversationRoundStep } from '@kbn/onechat-common';
import React from 'react';
import { useTimer } from '../../../hooks/use_timer';
import { MemoizedChatMessageText } from './chat_message_text';
import { RoundThinking } from './round_thinking';
import { RoundTimer } from './round_timer';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

const RoundResponse: React.FC<RoundResponseProps> = ({
  response: { message },
  steps,
  isLoading,
}) => {
  const { showTimer, elapsedTime, isStopped } = useTimer({ isLoading });
  const showThinking = showTimer || steps.length > 0;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      aria-label={i18n.translate('xpack.onechat.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
    >
      {showThinking && (
        <EuiFlexItem grow={false}>
          <RoundThinking
            steps={steps}
            loadingIndicator={
              showTimer ? <RoundTimer elapsedTime={elapsedTime} isStopped={isStopped} /> : null
            }
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <MemoizedChatMessageText content={message} steps={steps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const MemoizedRoundResponse = React.memo(RoundResponse);
