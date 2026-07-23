/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useFollowExecution } from '../../../../../hooks/use_follow_execution';
import { RoundEvents } from '../round_events';
import { JsonCodeBlock } from '../json_code_block';

const backLabel = i18n.translate('xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.back', {
  defaultMessage: 'Back',
});

const subAgentExecutionTitle = i18n.translate(
  'xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.title',
  { defaultMessage: 'Sub-agent execution' }
);

const executionIdLabel = i18n.translate(
  'xpack.agentBuilder.roundEvents.subAgentExecutionFlyout.executionIdLabel',
  { defaultMessage: 'Execution ID' }
);

const parametersLabel = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.parametersLabel',
  { defaultMessage: 'Parameters' }
);

const executionLabel = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.executionLabel',
  { defaultMessage: 'Execution' }
);

const resultLabel = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.resultLabel',
  { defaultMessage: 'Result' }
);

interface SubAgentExecutionFlyoutProps {
  executionId: string;
  params?: Record<string, unknown>;
  onClose: () => void;
}

export const SubAgentExecutionFlyout: React.FC<SubAgentExecutionFlyoutProps> = ({
  executionId,
  params,
  onClose,
}) => {
  const {
    steps: executionSteps,
    response,
    streamingMessage,
    error,
  } = useFollowExecution(executionId);
  const { euiTheme } = useEuiTheme();
  const displayMessage = response?.message ?? streamingMessage;
  const isRunning = !response && !error;
  const hasError = Boolean(error);

  const euiSteps = [
    ...(params
      ? [
          {
            title: parametersLabel,
            status: 'complete' as const,
            children: (
              <>
                <EuiSpacer size="s" />
                <JsonCodeBlock data={params} />
              </>
            ),
          },
        ]
      : []),
    {
      title: executionLabel,
      status: (hasError ? 'danger' : isRunning ? 'loading' : 'complete') as
        | 'danger'
        | 'loading'
        | 'complete',
      children: (
        <>
          <EuiSpacer size="s" />
          <RoundEvents steps={executionSteps} />
        </>
      ),
    },
    ...(!isRunning
      ? [
          {
            title: resultLabel,
            status: (hasError ? 'danger' : 'complete') as 'danger' | 'complete',
            children: (
              <>
                <EuiSpacer size="s" />
                {hasError ? (
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
                ) : displayMessage ? (
                  <EuiText size="m">
                    <EuiMarkdownFormat textSize="m">{displayMessage}</EuiMarkdownFormat>
                  </EuiText>
                ) : null}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="subAgentExecutionFlyoutTitle"
      size="m"
      ownFocus={false}
    >
      <EuiFlyoutHeader
        hasBorder
        css={css`
          && {
            padding-block: 4px;
            padding-left: 8px;
          }
        `}
      >
        <EuiButtonEmpty iconType="undo" onClick={onClose} flush="left" size="s" color="text">
          <EuiText size="xs">{backLabel}</EuiText>
        </EuiButtonEmpty>
      </EuiFlyoutHeader>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="l">
          <h2 id="subAgentExecutionFlyoutTitle">{subAgentExecutionTitle}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color={`${euiTheme.colors.textSubdued}`}>
          <p>
            {executionIdLabel} {executionId}
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSteps headingElement="h3" titleSize="xxs" steps={euiSteps} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
