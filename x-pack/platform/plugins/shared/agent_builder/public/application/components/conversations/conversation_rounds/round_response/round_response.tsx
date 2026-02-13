/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { AssistantResponse, ConversationRoundStep } from '@kbn/agent-builder-common';
import React from 'react';
import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';
import { RoundResponseActions } from './round_response_actions';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  hasError: boolean;
  isLastRound: boolean;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  hasError,
  response: { message },
  steps,
  isLoading,
  isLastRound,
}) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="m"
    aria-label={i18n.translate('xpack.agentBuilder.round.assistantResponse', {
      defaultMessage: 'Assistant response',
    })}
    data-test-subj="agentBuilderRoundResponse"
    css={css`
      position: relative;
    `}
  >
    <EuiFlexItem>
      {isLoading ? (
        <StreamingText content={message} steps={steps} />
      ) : (
        <ChatMessageText content={message} steps={steps} />
      )}
    </EuiFlexItem>
    {!isLoading && !hasError && (
      <EuiFlexItem grow={false}>
        <RoundResponseActions content={message} isVisible isLastRound={isLastRound} />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
