/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ThinkingItemLayout } from './thinking_item_layout';

const getStackTrace = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  // Fallback to onechat error formatter
  return formatOnechatErrorMessage(error);
};

interface ErrorContentProps {
  error: unknown;
}

export const ErrorThinkingItem: React.FC<ErrorContentProps> = ({ error }) => {
  const { euiTheme } = useEuiTheme();

  const codeBlockStyles = css`
    word-break: break-all;
    border-radius: ${euiTheme.border.radius.small};
  `;
  return (
    <ThinkingItemLayout>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                <h4>
                  <FormattedMessage
                    id="xpack.onechat.round.error.whatHappened"
                    defaultMessage="What happened"
                  />
                </h4>
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
    </ThinkingItemLayout>
  );
};
