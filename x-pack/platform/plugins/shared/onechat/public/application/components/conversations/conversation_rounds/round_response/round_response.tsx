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
import { StreamingText } from './streaming_text';
import { ChatMessageText } from './chat_message_text';

export interface RoundResponseProps {
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  response: { message },
  steps,
  isLoading,
}) => (
  <EuiFlexGroup
    direction="column"
    gutterSize="m"
    aria-label={i18n.translate('xpack.onechat.round.assistantResponse', {
      defaultMessage: 'Assistant response',
    })}
    data-test-subj="agentBuilderRoundResponse"
  >
    <EuiFlexItem>
      {isLoading ? (
        <StreamingText content={message} steps={steps} />
      ) : (
        <ChatMessageText content={message} steps={steps} />
      )}
    </EuiFlexItem>
  </EuiFlexGroup>
);
