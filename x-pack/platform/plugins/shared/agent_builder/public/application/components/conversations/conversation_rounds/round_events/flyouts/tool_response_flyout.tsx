/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiCode,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiSteps,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { internalTools } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { JsonCodeBlock } from '../json_code_block';
import { ToolResult } from '../results/tool_result';

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

interface ToolResponseFlyoutProps {
  step: ToolCallStepData;
  onClose: () => void;
}

export const ToolResponseFlyout: React.FC<ToolResponseFlyoutProps> = ({ step, onClose }) => {
  const stepTitleSize = useEuiFontSize('s');
  const { euiTheme } = useEuiTheme();
  const isSubAgentCall = step.tool_id === internalTools.runSubagent;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;
  const showExecutionSection = Boolean(subAgentExecutionId);
  const showResultSection = step.results.length > 0;
  const hasErrorResult = step.results.some(isErrorResult);

  const steps = [
    {
      title: parametersLabel,
      status: 'complete' as const,
      children: (
        <>
          <EuiSpacer size="s" />
          <JsonCodeBlock data={step.params} />
        </>
      ),
    },
    ...(showExecutionSection
      ? [
          {
            title: executionLabel,
            status: 'complete' as const,
            children: (
              <>
                <EuiSpacer size="s" />
                {/* TODO: replace with sub-agent execution drill-down — elastic/search-team#15172 */}
                {/* <EuiText size="s" color="subdued"><EuiCode>{subAgentExecutionId}</EuiCode></EuiText> */}
                <EuiText size="s" color="subdued">TODO</EuiText>
              </>
            ),
          },
        ]
      : []),
    ...(showResultSection
      ? [
          {
            title: resultLabel,
            status: (hasErrorResult ? 'danger' : 'complete') as 'danger' | 'complete',
            children: (
              <>
                <EuiSpacer size="s" />
                {step.results.map((result, idx) => (
                  <Fragment key={`flyout-result-${idx}`}>
                    <ToolResult result={result} />
                    {idx < step.results.length - 1 && <EuiSpacer size="s" />}
                  </Fragment>
                ))}
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiFlyout onClose={onClose} aria-labelledby="toolResponseFlyoutTitle" size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="toolResponseFlyoutTitle">tool: {step.tool_id}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div
          css={css`
            .euiStep__title {
              ${stepTitleSize}
            }
            .euiStep__content {
              margin-block-start: 0;
              padding-block-start: 0;
              padding-block-end: ${euiTheme.size.base};
            }
          `}
        >
          <EuiSteps headingElement="h3" titleSize="xxs" steps={steps} />
        </div>
      </EuiFlyoutBody>
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
