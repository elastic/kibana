/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
  useEuiShadow,
  EuiHorizontalRule,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { RoundFlyout } from './round_flyout';
import { RoundSteps } from './steps/round_steps';
import { ThinkingTimeDisplay } from './thinking_time_display';

const rawResponseButtonLabel = i18n.translate('xpack.onechat.conversation.rawResponseButton', {
  defaultMessage: 'View JSON',
});

const closePanelLabel = i18n.translate('xpack.onechat.conversation.closePanel', {
  defaultMessage: 'Close panel',
});

const reasoningLabel = i18n.translate('xpack.onechat.conversation.reasoning', {
  defaultMessage: 'Reasoning',
});
const completedReasoningLabel = i18n.translate('xpack.onechat.conversation.completedReasoning', {
  defaultMessage: 'Completed Reasoning',
});

interface RoundThinkingPanelProps {
  steps: ConversationRoundStep[];
  isLoading: boolean;
  rawRound: ConversationRound;
  onClose: () => void;
}

export const RoundThinkingPanel = ({
  steps,
  isLoading,
  rawRound,
  onClose,
}: RoundThinkingPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const [showFlyout, setShowFlyout] = useState(false);

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    border: 1px solid ${euiTheme.colors.borderStrongPrimary};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('l')};
  `;

  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

  const displayTitle = isLoading ? reasoningLabel : completedReasoningLabel;

  return (
    <>
      <EuiFlexGroup direction="column" responsive={false} css={containerStyles}>
        {/* Thinking Panel Title */}
        <EuiFlexGroup direction="row" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <p>{displayTitle}</p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={closePanelLabel}
              iconType="cross"
              color="text"
              onClick={onClose}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        {/* Thinking Steps */}
        <RoundSteps steps={steps} isLoading={isLoading} />

        {!isLoading && (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiHorizontalRule margin="none" />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <ThinkingTimeDisplay timeToFirstToken={rawRound.time_to_first_token} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton iconType={'code'} color="text" iconSide="left" onClick={toggleFlyout}>
                  {rawResponseButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
      <RoundFlyout isOpen={showFlyout} onClose={toggleFlyout} rawRound={rawRound} />
    </>
  );
};
