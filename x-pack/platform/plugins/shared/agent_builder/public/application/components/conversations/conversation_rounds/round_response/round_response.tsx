/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  AssistantResponse,
  ConversationRoundStep,
  RoundModelUsageStats,
} from '@kbn/onechat-common';
import React, { useState } from 'react';
import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';
import { RoundResponseActions } from './round_response_actions';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  modelUsage: RoundModelUsageStats;
  isLoading: boolean;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  response: { message },
  steps,
  modelUsage,
  isLoading,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label={i18n.translate('xpack.onechat.round.assistantResponse', {
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
      {!isLoading && (
        <EuiFlexItem grow={false}>
          <RoundResponseActions modelUsage={modelUsage} content={message} isVisible={isHovering} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
