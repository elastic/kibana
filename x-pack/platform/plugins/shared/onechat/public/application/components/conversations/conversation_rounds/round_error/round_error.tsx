/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { isContextLengthExceededAgentError } from '@kbn/onechat-common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { RoundErrorThinkingTitle } from './round_error_thinking_title';
import { ContextExceededRoundError } from './context_exceeded_round_error';
import { GenericRoundError } from './generic_round_error';
import { RoundErrorThinkingPanel } from './round_error_thinking_panel';

interface RoundErrorProps {
  error: unknown;
  onRetry: () => void;
}

const labels = {
  retryAriaLabel: i18n.translate('xpack.onechat.round.error.retryLabel', {
    defaultMessage: 'Retry',
  }),
  tryAgain: i18n.translate('xpack.onechat.round.error.tryAgain', {
    defaultMessage: 'Try again?',
  }),
};

export const RoundError: React.FC<RoundErrorProps> = ({ error, onRetry }) => {
  const { euiTheme } = useEuiTheme();
  const [showErrorThinkingPanel, setShowErrorThinkingPanel] = useState(false);

  const toggleErrorThinkingPanel = () => {
    setShowErrorThinkingPanel(!showErrorThinkingPanel);
  };

  const errorContent = isContextLengthExceededAgentError(error) ? (
    <ContextExceededRoundError />
  ) : (
    <GenericRoundError error={error} />
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      responsive={false}
      data-test-subj="agentBuilderRoundError"
    >
      {showErrorThinkingPanel ? (
        <RoundErrorThinkingPanel onClose={toggleErrorThinkingPanel}>
          {errorContent}
        </RoundErrorThinkingPanel>
      ) : (
        <RoundErrorThinkingTitle onClick={toggleErrorThinkingPanel} />
      )}
      <EuiFlexGroup direction="row" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            css={css`
              color: ${euiTheme.colors.textPrimary};
            `}
            data-test-subj="agentBuilderRoundErrorRetryButton"
            iconType="refresh"
            onClick={onRetry}
            aria-label={labels.retryAriaLabel}
          >
            {labels.tryAgain}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
