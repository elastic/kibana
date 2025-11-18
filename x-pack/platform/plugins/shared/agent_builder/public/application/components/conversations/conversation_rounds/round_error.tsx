/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiText,
  EuiPanel,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface RoundErrorProps {
  error: unknown;
  onRetry: () => void;
}

const getStackTrace = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  // Fallback to agentBuilder error formatter
  return formatAgentBuilderErrorMessage(error);
};

export const RoundError: React.FC<RoundErrorProps> = ({ error, onRetry }) => {
  const { euiTheme } = useEuiTheme();
  const codeBlockStyles = css`
    word-break: break-all;
    border-radius: ${euiTheme.border.radius.small};
  `;
  return (
    <EuiAccordion
      id="round-error"
      data-test-subj="agentBuilderRoundError"
      buttonContent={
        <FormattedMessage
          id="xpack.agentBuilder.round.error.title"
          defaultMessage="There was an error, expand for detailed information."
        />
      }
      extraAction={
        <EuiButtonEmpty
          aria-label={i18n.translate('xpack.agentBuilder.round.error.retryLabel', {
            defaultMessage: 'Retry',
          })}
          size="s"
          onClick={onRetry}
          data-test-subj="agentBuilderRoundErrorRetryButton"
        >
          <FormattedMessage id="xpack.agentBuilder.round.error.tryAgain" defaultMessage="Try again?" />
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="subdued">
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.agentBuilder.round.error.whatHappened"
                      defaultMessage="What happened"
                    />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.agentBuilder.round.error.whatHappenedDescription"
                      defaultMessage="Something in the query caused the model to freeze mid-thought. Performance debugging can be broad - try narrowing your question. See the error log below for specifics."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.agentBuilder.round.error.log"
                      defaultMessage="Error log"
                    />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCodeBlock
                  css={codeBlockStyles}
                  language="text"
                  fontSize="s"
                  paddingSize="m"
                  isCopyable
                  lineNumbers
                  transparentBackground
                  overflowHeight={500}
                >
                  {getStackTrace(error)}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
