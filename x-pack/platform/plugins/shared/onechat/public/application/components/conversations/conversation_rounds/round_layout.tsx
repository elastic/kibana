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
import { RoundResponse } from './round_response/round_response';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { RoundError } from './round_error/round_error';

interface RoundLayoutProps {
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
  isCurrentRound,
  scrollContainerHeight,
  rawRound,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);
  const { steps, response, input } = rawRound;

  const [hasBeenLoading, setHasBeenLoading] = useState(false);

  const { isResponseLoading, error, retry: retrySendMessage } = useSendMessage();

  const isLoadingCurrentRound = isResponseLoading && isCurrentRound;
  const isErrorCurrentRound = Boolean(error) && isCurrentRound;

  // Track if this round has ever been in a loading state during this session
  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setHasBeenLoading(true);
    }
  }, [isCurrentRound, isResponseLoading]);

  useEffect(() => {
    // Keep min-height if:
    // - Round is loading or errored
    // - Round has finished streaming but is still the current round (hasBeenLoading)
    // Remove min-height when a new round starts (isCurrentRound becomes false)
    const shouldHaveMinHeight =
      isErrorCurrentRound || (isCurrentRound && (isResponseLoading || hasBeenLoading));

    setRoundContainerMinHeight(shouldHaveMinHeight ? scrollContainerHeight : 0);
  }, [
    isCurrentRound,
    isResponseLoading,
    hasBeenLoading,
    scrollContainerHeight,
    isErrorCurrentRound,
  ]);

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : 'flex-grow: 0;'};
  `;
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="m"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
      {/* Input Message */}
      <EuiFlexItem grow={false}>
        <RoundInput input={input.message} attachments={input.attachments} />
      </EuiFlexItem>

      {/* Thinking */}
      <EuiFlexItem grow={false}>
        {isErrorCurrentRound ? (
          <RoundError error={error} errorSteps={rawRound.steps} onRetry={retrySendMessage} />
        ) : (
          <RoundThinking steps={steps} isLoading={isLoadingCurrentRound} rawRound={rawRound} />
        )}
      </EuiFlexItem>

      {/* Response Message */}
      <EuiFlexItem grow={false}>
        <EuiFlexItem>
          <RoundResponse
            hasError={isErrorCurrentRound}
            response={response}
            steps={steps}
            isLoading={isLoadingCurrentRound}
          />
        </EuiFlexItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
