/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ConversationRound, ConversationRoundStepType } from '@kbn/onechat-common';
import {
  EuiPanel,
  EuiText,
  EuiSpacer,
  useEuiTheme,
  EuiIcon,
  EuiCodeBlock,
  EuiAccordion,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { ChatMessageText } from './chat_message_text';

export interface RoundAnswerProps {
  round: ConversationRound;
}

export const RoundAnswer: React.FC<RoundAnswerProps> = ({ round }) => {
  const { euiTheme } = useEuiTheme();
  const { response, steps } = round;

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

  return (
    <>
      {steps?.map((step) => {
        if (step.type === ConversationRoundStepType.toolCall) {
          return (
            <div key={step.tool_call_id}>
              <EuiPanel className={toolCallPanelClass} hasShadow={false} hasBorder={true}>
                <div className={stepHeaderClass}>
                  <EuiIcon type="wrench" color="primary" />
                  <EuiText size="s" color="subdued">
                    Tool: {step.tool_id}
                  </EuiText>
                </div>
                <EuiSpacer size="xs" />
                <EuiAccordion
                  id={`args-${step.tool_call_id}`}
                  buttonContent={
                    <EuiText size="xs" color="subdued">
                      Tool call args
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
                      {JSON.stringify(step.params, null, 2)}
                    </EuiCodeBlock>
                  </div>
                </EuiAccordion>
                <EuiSpacer size="s" />
                {step.result ? (
                  <div className={codeBlockClass}>
                    <EuiCodeBlock
                      language="json"
                      fontSize="s"
                      paddingSize="s"
                      isCopyable={false}
                      transparentBackground
                    >
                      {step.result}
                    </EuiCodeBlock>
                  </div>
                ) : (
                  <EuiText size="s" color="subdued">
                    No result available
                  </EuiText>
                )}
              </EuiPanel>
              <EuiSpacer size="m" />
            </div>
          );
        }
        return null;
      })}
      <ChatMessageText content={response?.message ?? ''} />
    </>
  );
};
