/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundText } from './round_text/round_text';
import { useRoundContext } from '../../../context/conversation_round/round_context';

export const RoundResponse: React.FC<{}> = () => {
  const {
    round: {
      steps,
      response: { message },
    },
    isLoading,
    isError,
  } = useRoundContext();
  const showThinking = steps.length > 0 || isError;
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
          <RoundThinking />
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <RoundText isLoading={isLoading} content={message} steps={steps} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
