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
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
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

interface SectionHeaderProps {
  title: string;
  isError?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, isError = false }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon
        type={isError ? 'alert' : 'checkInCircleFilled'}
        color={isError ? 'danger' : 'success'}
        aria-hidden={true}
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

interface ToolResponseFlyoutProps {
  step: ToolCallStepData;
  onClose: () => void;
}

export const ToolResponseFlyout: React.FC<ToolResponseFlyoutProps> = ({ step, onClose }) => {
  const { euiTheme } = useEuiTheme();

  const isSubAgentCall = step.tool_id === internalTools.runSubagent;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;
  const showExecutionSection = Boolean(subAgentExecutionId);
  const showResultSection = step.results.length > 0;

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="toolResponseFlyoutTitle"
      size="m"
      maskProps={{ style: 'background: transparent' }}
      css={css`
        z-index: ${Number(euiTheme.levels.flyout) + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="toolResponseFlyoutTitle">tool: {step.tool_id}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <SectionHeader title={parametersLabel} />
        <EuiSpacer size="s" />
        <JsonCodeBlock data={step.params} />

        {showExecutionSection && (
          <>
            <EuiSpacer size="m" />
            <SectionHeader title={executionLabel} />
            <EuiSpacer size="s" />
            {/* TODO: drilling into sub-agent execution — see elastic/search-team#15172 */}
            <EuiText size="s" color="subdued">
              <EuiCode>{subAgentExecutionId}</EuiCode>
            </EuiText>
          </>
        )}

        {showResultSection && (
          <>
            <EuiSpacer size="m" />
            <SectionHeader title={resultLabel} isError={step.results.some(isErrorResult)} />
            <EuiSpacer size="s" />
            {step.results.map((result, idx) => (
              <Fragment key={`flyout-result-${idx}`}>
                <ToolResult result={result} />
                {idx < step.results.length - 1 && <EuiSpacer size="s" />}
              </Fragment>
            ))}
          </>
        )}
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
