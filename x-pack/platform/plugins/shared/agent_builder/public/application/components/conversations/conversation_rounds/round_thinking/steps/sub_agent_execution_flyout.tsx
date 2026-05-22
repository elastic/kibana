/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiMarkdownFormat,
  EuiPanel,
  EuiCodeBlock,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import { RoundSteps } from './round_steps';
import { useFollowExecution } from '../../../../../hooks/use_follow_execution';

interface SubAgentExecutionFlyoutProps {
  executionId: string;
  params?: Record<string, any>;
  onClose: () => void;
}

export const SubAgentExecutionFlyout: React.FC<SubAgentExecutionFlyoutProps> = ({
  executionId,
  params,
  onClose,
}) => {
  const { steps, isLoading, response, streamingMessage, error } = useFollowExecution(executionId);
  const displayMessage = response?.message ?? streamingMessage;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="subAgentExecutionFlyoutTitle"
      size="m"
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="subAgentExecutionFlyoutTitle">
            <FormattedMessage
              id="xpack.agentBuilder.conversation.subAgentExecutionFlyout.title"
              defaultMessage="Sub-agent execution"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.conversation.subAgentExecutionFlyout.executionId"
              defaultMessage="Execution ID: {executionId}"
              values={{ executionId }}
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {params && (
          <>
            <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable>
              {JSON.stringify(params, null, 2)}
            </EuiCodeBlock>
            <EuiSpacer size="m" />
          </>
        )}
        {error && (
          <>
            <EuiCallOut title="Execution error" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <RoundSteps steps={steps} isLoading={isLoading} />
        {displayMessage && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder paddingSize="m">
              <EuiTitle size="xs">
                <h3>
                  {response ? (
                    <FormattedMessage
                      id="xpack.agentBuilder.conversation.subAgentExecutionFlyout.finalResponse"
                      defaultMessage="Final response"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.agentBuilder.conversation.subAgentExecutionFlyout.responding"
                      defaultMessage="Responding..."
                    />
                  )}
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="m">
                <EuiMarkdownFormat textSize="m">{displayMessage}</EuiMarkdownFormat>
              </EuiText>
            </EuiPanel>
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
