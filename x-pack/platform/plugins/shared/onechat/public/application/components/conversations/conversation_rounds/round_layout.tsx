/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { ConversationRound } from '@kbn/onechat-common';
import { RoundInput } from './round_input';
import { RoundThinking } from './round_thinking/round_thinking';
import { RoundResponse } from './round_response';

interface RoundLayoutProps {
  isResponseLoading: boolean;
  hasError: boolean;
  isCurrentRound: boolean;
  scrollContainerHeight: number;
  rawRound: ConversationRound;
}

const labels = {
  container: i18n.translate('xpack.onechat.round.container', {
    defaultMessage: 'Conversation round',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  isResponseLoading,
  hasError,
  isCurrentRound,
  scrollContainerHeight,
  rawRound,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const { steps, response, input } = rawRound;

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else if (!isCurrentRound) {
      setRoundContainerMinHeight(0);
    }
  }, [isCurrentRound, isResponseLoading, scrollContainerHeight]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : ''}
  `;

  const isCurrentRoundLoading = isResponseLoading && isCurrentRound;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      {/* Input Message */}
      <EuiFlexItem grow={false}>
        <RoundInput input={input.message} />
      </EuiFlexItem>

      {/* Thinking */}
      <EuiFlexItem grow={false}>
        <RoundThinking steps={steps} isLoading={isCurrentRoundLoading} rawRound={rawRound} />
      </EuiFlexItem>

      {/* Response Message */}
      <EuiFlexItem grow={false}>
        <EuiFlexItem>
          <RoundResponse response={response} steps={steps} isLoading={isCurrentRoundLoading} />
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
