/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
  useEuiShadow,
  EuiHorizontalRule,
  EuiIcon,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { RoundFlyout } from './round_flyout';
import { RoundSteps } from './steps/round_steps';
import { ThinkingTimeDisplay } from './thinking_time_display';
import { RoundIcon } from './round_icon';
import { InputOutputTokensDisplay } from './input_output_tokens_display';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const rawResponseButtonLabel = i18n.translate('xpack.agentBuilder.conversation.rawResponseButton', {
  defaultMessage: 'View JSON',
});

const closePanelLabel = i18n.translate('xpack.agentBuilder.conversation.closePanel', {
  defaultMessage: 'Close panel',
});

const reasoningLabel = i18n.translate('xpack.agentBuilder.conversation.reasoning', {
  defaultMessage: 'Reasoning',
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
    ${borderRadiusXlStyles}
    border: ${isLoading ? `1px solid ${euiTheme.colors.borderStrongPrimary}` : 'none'};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('l')};
  `;

  const toggleFlyout = () => {
    setShowFlyout(!showFlyout);
  };

  return (
    <>
      <EuiFlexGroup
        direction="column"
        responsive={false}
        css={containerStyles}
        data-test-subj="agentBuilderThinkingPanel"
      >
        {/* Thinking Panel Title */}
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          responsive={false}
          onClick={onClose}
          aria-label={closePanelLabel}
          data-test-subj="agentBuilderThinkingToggle"
          css={css`
            cursor: pointer;
          `}
        >
          <EuiFlexGroup responsive={false} gutterSize="m" direction="row" alignItems="center">
            <RoundIcon isLoading={isLoading} />
            <EuiTitle size="xs">
              <p>{reasoningLabel}</p>
            </EuiTitle>
            <EuiIcon type="arrowDown" color="subdued" size="m" />
          </EuiFlexGroup>
        </EuiFlexGroup>

        {/* Thinking Steps */}
        <RoundSteps steps={steps} isLoading={isLoading} />

        {!isLoading && (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            <EuiHorizontalRule margin="none" />
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexGroup direction="row" alignItems="center" gutterSize="l">
                <ThinkingTimeDisplay timeToFirstToken={rawRound.time_to_first_token} />
                <InputOutputTokensDisplay modelUsage={rawRound.model_usage} />
              </EuiFlexGroup>
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
