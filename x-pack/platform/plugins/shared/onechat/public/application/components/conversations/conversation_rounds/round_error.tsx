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
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { isContextLengthExceededAgentError } from '@kbn/onechat-common';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { docLinks } from '../../../../../common/doc_links';

interface RoundErrorProps {
  error: unknown;
  onRetry: () => void;
}

const COMMON_LABELS = {
  errorTitle: i18n.translate('xpack.onechat.round.error.title', {
    defaultMessage: 'There was an error, expand for detailed information.',
  }),
  retryAriaLabel: i18n.translate('xpack.onechat.round.error.retryLabel', {
    defaultMessage: 'Retry',
  }),
  tryAgain: i18n.translate('xpack.onechat.round.error.tryAgain', {
    defaultMessage: 'Try again?',
  }),
  whatHappened: i18n.translate('xpack.onechat.round.error.whatHappened', {
    defaultMessage: 'What happened',
  }),
};

const getStackTrace = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  // Fallback to onechat error formatter
  return formatOnechatErrorMessage(error);
};

interface ErrorAccordionProps {
  onRetry: () => void;
  testSubject: string;
  children: React.ReactNode;
}

const ErrorAccordion: React.FC<ErrorAccordionProps> = ({ onRetry, testSubject, children }) => {
  return (
    <EuiAccordion
      id="round-error"
      data-test-subj={testSubject}
      buttonContent={COMMON_LABELS.errorTitle}
      extraAction={
        <EuiButtonEmpty
          aria-label={COMMON_LABELS.retryAriaLabel}
          size="s"
          onClick={onRetry}
          data-test-subj="agentBuilderRoundErrorRetryButton"
        >
          {COMMON_LABELS.tryAgain}
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="subdued">
        {children}
      </EuiPanel>
    </EuiAccordion>
  );
};

const ContextExceededError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  return (
    <ErrorAccordion onRetry={onRetry} testSubject="agentBuilderRoundErrorContextExceeded">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <h4>{COMMON_LABELS.whatHappened}</h4>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.onechat.round.error.contextExceeded.description"
                defaultMessage="This conversation exceeded the maximum context length. This typically occurs when tools return a very large response. Try again with a different request or start a new conversation. {docsLink}."
                values={{
                  docsLink: (
                    <EuiLink
                      href={`${docLinks.limitationsKnownIssues}#conversation-length-exceeded`}
                      external
                      target="_blank"
                    >
                      <FormattedMessage
                        id="xpack.onechat.round.error.contextExceeded.docsLink"
                        defaultMessage="Learn more"
                      />
                    </EuiLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ErrorAccordion>
  );
};

const GenericRoundError: React.FC<{ error: unknown; onRetry: () => void }> = ({
  error,
  onRetry,
}) => {
  const { euiTheme } = useEuiTheme();
  const codeBlockStyles = css`
    word-break: break-all;
    border-radius: ${euiTheme.border.radius.small};
  `;

  return (
    <ErrorAccordion onRetry={onRetry} testSubject="agentBuilderRoundError">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h4>{COMMON_LABELS.whatHappened}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.onechat.round.error.whatHappenedDescription"
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
                  <FormattedMessage id="xpack.onechat.round.error.log" defaultMessage="Error log" />
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
    </ErrorAccordion>
  );
};

export const RoundError: React.FC<RoundErrorProps> = ({ error, onRetry }) => {
  if (isContextLengthExceededAgentError(error)) {
    return <ContextExceededError onRetry={onRetry} />;
  }

  return <GenericRoundError error={error} onRetry={onRetry} />;
};
