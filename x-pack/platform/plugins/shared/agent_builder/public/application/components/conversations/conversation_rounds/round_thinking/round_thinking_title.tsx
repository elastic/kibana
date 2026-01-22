/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useSendMessage } from '../../../../context/send_message/send_message_context';
import { RoundIcon } from './round_icon';
import { lineClampStyles } from '../../../../../common.styles';

const clampTextStyles = css`
  word-break: break-all;
  ${lineClampStyles(1)}
`;

const defaultThinkingLabel = i18n.translate('xpack.agentBuilder.conversation.thinking.label', {
  defaultMessage: 'Thinking…',
});
const thinkingCompletedLabel = i18n.translate(
  'xpack.agentBuilder.conversation.thinking.completedReasoning',
  {
    defaultMessage: 'Completed reasoning',
  }
);

interface RoundThinkingTitleProps {
  isLoading: boolean;
  hasSteps: boolean;
  onShow: () => void;
}

// We use a min-height to stop the title growing in height to match the height of the button when it's shown.
const MIN_HEIGHT = '40px';

export const RoundThinkingTitle = ({ isLoading, hasSteps, onShow }: RoundThinkingTitleProps) => {
  const { agentReasoning } = useSendMessage();

  let thinkingButtonLabel = thinkingCompletedLabel;
  if (isLoading) {
    // While this round is loading, show the agent reasoning as the button label if available
    // Otherwise fallback to default thinking label.
    // Agent reasoning can be reasoning directly from the agent or individual tool call progression
    thinkingButtonLabel = agentReasoning
      ? i18n.translate('xpack.agentBuilder.conversation.thinking.reasoningInProgress', {
          defaultMessage: '{reasoning}…',
          values: { reasoning: agentReasoning },
        })
      : defaultThinkingLabel;
  }

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      responsive={false}
      data-test-subj="agentBuilderThinkingToggle"
      onClick={hasSteps ? onShow : undefined}
      alignItems="center"
      css={css`
        min-height: ${MIN_HEIGHT};
        cursor: ${hasSteps ? 'pointer' : 'default'};
        &:hover {
          text-decoration: ${hasSteps ? 'underline' : 'none'};
        }
      `}
    >
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <RoundIcon isLoading={isLoading} />
        </EuiFlexItem>
        <EuiText size="s" color="subdued" css={clampTextStyles}>
          <p>{thinkingButtonLabel}</p>
        </EuiText>
        {hasSteps && <EuiIcon type="arrowRight" color="subdued" size="m" />}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
