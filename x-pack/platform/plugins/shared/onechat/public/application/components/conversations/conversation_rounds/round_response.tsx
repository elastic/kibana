/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AssistantResponse,
  ConversationRound,
  ConversationRoundStep,
} from '@kbn/onechat-common';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { ConversationSettings } from '../../../../services/types';
import { useTimer } from '../../../hooks/use_timer';
import { useOnechatServices } from '../../../hooks/use_onechat_service';
import { ChatMessageText } from './chat_message_text';
import { RoundThinking } from './round_thinking/round_thinking';

export interface RoundResponseProps {
  rawRound: ConversationRound;
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  rawRound,
  response: { message },
  steps,
  isLoading,
}) => {
  const timer = useTimer({ isLoading });
  const { conversationSettingsService } = useOnechatServices();

  // Subscribe to conversation settings to get the commentActionsMounter
  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const commentActionsMounter = conversationSettings?.commentActionsMounter;
  const showThinking = timer.showTimer || steps.length > 0;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={i18n.translate('xpack.onechat.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
    >
      {showThinking && (
        <EuiFlexItem grow={false}>
          <RoundThinking steps={steps} isLoading={isLoading} timer={timer} rawRound={rawRound} />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <ChatMessageText
          content={message}
          steps={steps}
          contentReferences={rawRound.metadata?.contentReferences}
        />
      </EuiFlexItem>

      {/* Render comment actions if available */}
      {commentActionsMounter && (
        <EuiFlexItem grow={false}>
          {React.createElement(commentActionsMounter, { message: { content: message } })}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
