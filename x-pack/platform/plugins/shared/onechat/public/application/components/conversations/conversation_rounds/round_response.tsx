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
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundText } from './round_text/round_text';

export interface RoundResponseProps {
  rawRound: ConversationRound;
  response: AssistantResponse;
  steps: ConversationRoundStep[];
  isLoading: boolean;
  error: unknown;
}

export const RoundResponse: React.FC<RoundResponseProps> = ({
  rawRound,
  response: { message },
  steps,
  isLoading,
  error,
}) => {
  const showThinking = steps.length > 0 || Boolean(error);
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={i18n.translate('xpack.onechat.round.assistantResponse', {
        defaultMessage: 'Assistant response',
      })}
      data-test-subj="agentBuilderRoundResponse"
    >
      {showThinking && (
        <EuiFlexItem grow={false}>
          <RoundThinking steps={steps} isLoading={isLoading} rawRound={rawRound} error={error} />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <RoundText isLoading={isLoading} content={message} steps={steps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
