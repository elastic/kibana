/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
  EuiIcon,
  EuiText,
  EuiAccordion,
  EuiCodeBlock,
} from '@elastic/eui';
import { ToolCallStep } from '@kbn/onechat-common';
import React from 'react';
import { css } from '@emotion/css';
import { conversationsCommonLabels } from '../i18n';

interface ToolCallPanelProps {
  step: ToolCallStep;
}

export const ToolCallPanel: React.FC<ToolCallPanelProps> = ({
  step: { result, tool_call_id: callId, tool_id: toolId, params },
}) => {
  const { euiTheme } = useEuiTheme();
  const toolCallPanelClass = css`
    margin-bottom: ${euiTheme.size.m};
    padding: ${euiTheme.size.m};
    background-color: ${euiTheme.colors.lightestShade};
  `;
  const stepHeaderClass = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;
  const codeBlockClass = css`
    background-color: ${euiTheme.colors.emptyShade};
    border: 1px solid ${euiTheme.colors.lightShade};
    border-radius: ${euiTheme.border.radius.medium};
  `;
  const labels = conversationsCommonLabels.content.messages.round.steps;
  return (
    <div key={callId}>
      <EuiPanel className={toolCallPanelClass} hasShadow={false} hasBorder={true}>
        <div className={stepHeaderClass}>
          <EuiIcon type="wrench" color="primary" />
          <EuiText size="s" color="subdued">
            {labels.toolCall.header} {toolId}
          </EuiText>
        </div>
        <EuiSpacer size="xs" />
        <EuiAccordion
          id={`args-${callId}`}
          buttonContent={
            <EuiText size="xs" color="subdued">
              {labels.toolCall.args}
            </EuiText>
          }
          paddingSize="s"
        >
          <div className={codeBlockClass}>
            <EuiCodeBlock
              language="json"
              fontSize="s"
              paddingSize="s"
              isCopyable={false}
              transparentBackground
            >
              {JSON.stringify(params, null, 2)}
            </EuiCodeBlock>
          </div>
        </EuiAccordion>
        <EuiSpacer size="s" />
        {result ? (
          <EuiAccordion
            id={`result-${callId}`}
            buttonContent={
              <EuiText size="xs" color="subdued">
                {labels.toolCall.result}
              </EuiText>
            }
          >
            <div className={codeBlockClass}>
              <EuiCodeBlock
                language="json"
                fontSize="s"
                paddingSize="s"
                isCopyable={false}
                transparentBackground
              >
                {result}
              </EuiCodeBlock>
            </div>
          </EuiAccordion>
        ) : (
          <EuiText size="s" color="subdued">
            {labels.toolCall.noResult}
          </EuiText>
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
    </div>
  );
};
