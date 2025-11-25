/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { RoundIcon } from '../round_icon';

const clampTextStyles = css`
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: ver;
`;

const defaultThinkingLabel = i18n.translate('xpack.onechat.conversation.thinking.label', {
  defaultMessage: 'Thinking...',
});
const thinkingCompletedLabel = i18n.translate('xpack.onechat.conversation.completedReasoning', {
  defaultMessage: 'Completed reasoning',
});
const showButtonLabel = i18n.translate('xpack.onechat.conversation.thinking.show', {
  defaultMessage: 'Show',
});

interface RoundThinkingTitleProps {
  isLoading: boolean;
  isError: boolean;
  hasSteps: boolean;
  onShow: () => void;
}

// We use a min-height to stop the title growing in height to match the height of the button when it's shown.
const MIN_HEIGHT = '40px';

export const RoundThinkingTitle = ({
  isLoading,
  isError,
  hasSteps,
  onShow,
}: RoundThinkingTitleProps) => {
  const { agentReasoning } = useSendMessage();

  let thinkingButtonLabel = thinkingCompletedLabel;
  if (isLoading) {
    // While this round is loading, show the agent reasoning as the button label if available
    // Otherwise fallback to default thinking label.
    // Agent reasoning can be reasoning directly from the agent or individual tool call progression
    thinkingButtonLabel = agentReasoning ?? defaultThinkingLabel;
  }

  // TODO: if thinkingCompleted and hasSteps === false, maybe don't render anything. TBC with Julian

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      responsive={false}
      alignItems="center"
      css={css`
        min-height: ${MIN_HEIGHT};
      `}
    >
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="center">
        <EuiFlexItem grow={false}>
          <RoundIcon isLoading={isLoading} isError={false} />
        </EuiFlexItem>
        <EuiText size="s" color="subdued" css={clampTextStyles}>
          <p>{thinkingButtonLabel}</p>
        </EuiText>
      </EuiFlexGroup>
      {hasSteps && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="text" onClick={onShow}>
            {showButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
