/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiSteps,
  EuiLoadingSpinner,
  useEuiTheme,
  useGeneratedHtmlId,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { internalTools } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { JsonCodeBlock } from '../json_code_block';
import { ToolResult } from '../results/tool_result';
import { SubAgentExecutionFlyout } from './sub_agent_execution_flyout';
import { parametersLabel, executionLabel, resultLabel } from './flyout_labels';
import { useSteppedFlyoutStyles } from './use_stepped_flyout_styles';

const backLabel = i18n.translate('xpack.agentBuilder.conversation.toolResponseFlyout.back', {
  defaultMessage: 'Back',
});

const subAgentExecutionLabel = i18n.translate(
  'xpack.agentBuilder.conversation.toolResponseFlyout.subAgentExecutionLabel',
  { defaultMessage: 'Sub-agent execution' }
);

const toolLabel = i18n.translate('xpack.agentBuilder.conversation.toolResponseFlyout.toolLabel', {
  defaultMessage: 'tool',
});

interface ToolResponseFlyoutProps {
  step: ToolCallStepData;
  onClose: () => void;
  onBack?: () => void;
}

export const ToolResponseFlyout: React.FC<ToolResponseFlyoutProps> = ({
  step,
  onClose,
  onBack,
}) => {
  const { euiTheme } = useEuiTheme();
  const { backHeaderCss, stepsCss } = useSteppedFlyoutStyles();
  const titleId = useGeneratedHtmlId({ prefix: 'toolResponseFlyout' });
  const [isSubFlyoutOpen, { on: openSubFlyout, off: closeSubFlyout }] = useBoolean();

  const isSubAgentCall = step.tool_id === internalTools.runSubagent;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;
  const showExecutionSection = isSubAgentCall;
  const isSubAgentRunning = isSubAgentCall && step.results.length === 0;
  const showResultSection = step.results.length > 0;
  const hasErrorResult = step.results.some(isErrorResult);

  const steps = [
    {
      title: parametersLabel,
      status: 'complete' as const,
      children: <JsonCodeBlock data={step.params} lineNumbers={false} background="subdued" />,
    },
    ...(showExecutionSection
      ? [
          {
            title: executionLabel,
            status: (isSubAgentRunning ? 'loading' : 'complete') as 'loading' | 'complete',
            children: !subAgentExecutionId ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <ul
                css={css`
                  list-style-type: disc;
                  padding-inline-start: ${euiTheme.size.l};
                  margin: 0;
                `}
              >
                <li>
                  <EuiButtonEmpty
                    iconType="sortRight"
                    iconSide="right"
                    flush="left"
                    size="s"
                    css={css`
                      color: ${euiTheme.colors.textDisabled};
                    `}
                    onClick={openSubFlyout}
                  >
                    <EuiText size="m" color={`${euiTheme.colors.textDisabled}`}>
                      {subAgentExecutionLabel} {subAgentExecutionId}
                    </EuiText>
                  </EuiButtonEmpty>
                </li>
              </ul>
            ),
          },
        ]
      : []),
    ...(showResultSection
      ? [
          {
            title: resultLabel,
            status: (hasErrorResult ? 'danger' : 'complete') as 'danger' | 'complete',
            children: step.results.map((result, idx) => (
              <Fragment key={`flyout-result-${idx}`}>
                <ToolResult result={result} />
                {idx < step.results.length - 1 && <EuiSpacer size="s" />}
              </Fragment>
            )),
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus={!onBack}
      outsideClickCloses={onBack ? true : undefined}
    >
      {onBack && (
        <EuiFlyoutHeader hasBorder css={backHeaderCss}>
          <EuiButtonEmpty iconType="undo" onClick={onBack} flush="left" size="s" color="text">
            <EuiText size="xs" component="span">
              {backLabel}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlyoutHeader>
      )}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {toolLabel}: {step.tool_id}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSteps headingElement="h3" titleSize="xxs" steps={steps} css={stepsCss} />
      </EuiFlyoutBody>
      {isSubFlyoutOpen && subAgentExecutionId && (
        <SubAgentExecutionFlyout
          executionId={subAgentExecutionId}
          params={step.params}
          isCompleted={!isSubAgentRunning}
          onBack={closeSubFlyout}
          onClose={onClose}
        />
      )}
    </EuiFlyout>
  );
};

interface SubAgentResultData {
  agent_execution_id?: string;
}

const getSubAgentExecutionId = (step: ToolCallStepData): string | undefined => {
  const fromResults = step.results.find(
    (r) => (r.data as SubAgentResultData | undefined)?.agent_execution_id
  );
  if (fromResults) {
    return (fromResults.data as SubAgentResultData).agent_execution_id;
  }
  return step.progression?.find((p) => p.metadata?.agent_execution_id)?.metadata
    ?.agent_execution_id;
};
