/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFollowExecution } from '../../../../../hooks/use_follow_execution';
import { RoundEvents } from '../round_events';
import { JsonCodeBlock } from '../json_code_block';

interface SubAgentExecutionFlyoutProps {
  executionId: string;
  params?: Record<string, unknown>;
  onClose: () => void;
}

/**
 * Flyout showing a sub-agent's full execution — params, error (if any), the
 * sub-agent's own steps (rendered recursively via `RoundEvents`), and the
 * final response message.
 */
export const SubAgentExecutionFlyout: React.FC<SubAgentExecutionFlyoutProps> = ({
  executionId,
  params,
  onClose,
}) => {
  const { steps, response, streamingMessage, error } = useFollowExecution(executionId);
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
              id="xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.title"
              defaultMessage="Sub-agent execution"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>
            <FormattedMessage
              id="xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.executionId"
              defaultMessage="Execution ID: {executionId}"
              values={{ executionId }}
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {params && (
          <>
            <JsonCodeBlock data={params} />
            <EuiSpacer size="m" />
          </>
        )}
        {error && (
          <>
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.errorTitle"
                  defaultMessage="Execution error"
                />
              }
              color="danger"
              iconType="error"
            >
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <RoundEvents steps={steps} isReloadedRound={false} hideMasterToggle />
        {displayMessage && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder paddingSize="m">
              <EuiTitle size="xs">
                <h3>
                  {response ? (
                    <FormattedMessage
                      id="xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.finalResponse"
                      defaultMessage="Final response"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.responding"
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
