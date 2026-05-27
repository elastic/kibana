/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { internalTools, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { getEbtProps } from '@kbn/ebt-click';
import { StepLayout } from '../step_layout';
import { JsonCodeBlock } from '../json_code_block';
import { ToolResult } from '../results/tool_result';
import { ToolResponseFlyout } from '../flyouts/tool_response_flyout';
import { SubAgentExecutionFlyout } from '../flyouts/sub_agent_execution_flyout';

const labels = {
  toolCall: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.ariaLabel', {
    defaultMessage: 'Tool call',
  }),
  parameters: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.parametersLabel', {
    defaultMessage: 'Parameters sent',
  }),
  result: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.resultLabel', {
    defaultMessage: 'Response returned',
  }),
  viewJson: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.viewJson', {
    defaultMessage: 'View JSON',
  }),
  viewExecution: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.viewExecution', {
    defaultMessage: 'View execution',
  }),
};

interface ToolCallStepProps {
  step: ToolCallStepData;
}

/**
 * Renders a `ToolCallStep`. Clickable to expand into:
 *   - A "Parameters sent" accordion (JSON)
 *   - Each progression message as a plain row
 *   - A "Response returned" row with an inline "View JSON" (or
 *     "View execution" for sub-agent calls) link
 */
export const ToolCallStep: React.FC<ToolCallStepProps> = ({ step }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const onToggle = () => setIsExpanded((v) => !v);

  const hasResults = step.results.length > 0;

  return (
    <StepLayout
      label={<ToolCallHeadline step={step} hasResults={hasResults} />}
      onClick={onToggle}
      isExpanded={isExpanded}
      expansion={<ToolCallExpansion step={step} />}
      ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_TOOL_CALL_STEP}
    />
  );
};

const ToolCallHeadline: React.FC<{ step: ToolCallStepData; hasResults: boolean }> = ({
  step,
  hasResults,
}) => {
  const hasErrorResult = step.results.some(isErrorResult);

  const toolBadge = (
    <EuiBadge
      iconType="wrench"
      color={hasErrorResult ? 'danger' : 'default'}
      css={css`
        vertical-align: inherit;
      `}
    >
      {step.tool_id}
    </EuiBadge>
  );

  return (
    <EuiText color={hasErrorResult ? 'danger' : 'inherit'}>
      <p role="status" aria-label={labels.toolCall}>
        {hasResults ? (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.toolCall.responded"
            defaultMessage="Tool {tool} responded"
            values={{ tool: toolBadge }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.toolCall.calling"
            defaultMessage="Calling tool {tool}"
            values={{ tool: toolBadge }}
          />
        )}
      </p>
    </EuiText>
  );
};

const ToolCallExpansion: React.FC<{ step: ToolCallStepData }> = ({ step }) => {
  const { euiTheme } = useEuiTheme();

  // Sub-agent invocations get the rich `SubAgentExecutionFlyout` (nested
  // steps + final response). The execution_id is available from results once
  // the sub-agent completes, or from progression metadata while it's still
  // running — we look in both.
  const isSubAgentCall = step.tool_id === internalTools.runSubagent;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;
  const showResponseRow = isSubAgentCall ? Boolean(subAgentExecutionId) : step.results.length > 0;

  const containerStyles = css`
    padding-left: ${euiTheme.size.s};
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.s};
  `;

  return (
    <div css={containerStyles}>
      <ParametersAccordion id={`${step.tool_call_id}-parameters`} params={step.params} />

      {step.progression?.map((p, idx) => (
        <EuiText key={`progression-${idx}`} size="s" color="subdued">
          <p>{p.message}</p>
        </EuiText>
      ))}

      {showResponseRow && (
        <ResponseRow
          step={step}
          isSubAgentCall={isSubAgentCall}
          subAgentExecutionId={subAgentExecutionId}
        />
      )}
    </div>
  );
};

const ParametersAccordion: React.FC<{
  id: string;
  params: ToolCallStepData['params'];
}> = ({ id, params }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiAccordion
      id={id}
      forceState={isOpen ? 'open' : 'closed'}
      onToggle={setIsOpen}
      arrowDisplay="none"
      buttonContent={
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          alignItems="center"
          responsive={false}
          css={css`
            width: fit-content;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {labels.parameters}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon
              type={isOpen ? 'arrowUp' : 'arrowDown'}
              size="s"
              color="subdued"
              aria-hidden={true}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="s"
    >
      <JsonCodeBlock data={params} />
    </EuiAccordion>
  );
};

/**
 * "Response returned • View JSON" (or "• View execution" for sub-agent calls)
 * row. Not an accordion — clicking the link opens a flyout.
 */
const ResponseRow: React.FC<{
  step: ToolCallStepData;
  isSubAgentCall: boolean;
  subAgentExecutionId: string | undefined;
}> = ({ step, isSubAgentCall, subAgentExecutionId }) => {
  const { euiTheme } = useEuiTheme();

  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const openFlyout = useCallback(() => setIsFlyoutOpen(true), []);
  const closeFlyout = useCallback(() => setIsFlyoutOpen(false), []);

  const showSubAgentFlyout = isSubAgentCall && Boolean(subAgentExecutionId);
  const linkLabel = showSubAgentFlyout ? labels.viewExecution : labels.viewJson;
  const linkTestSubj = showSubAgentFlyout ? 'toolCallViewExecutionLink' : 'toolCallViewJsonLink';
  const linkAction = showSubAgentFlyout
    ? AGENT_BUILDER_UI_EBT.action.conversation.VIEW_SUB_AGENT_EXECUTION
    : AGENT_BUILDER_UI_EBT.action.conversation.VIEW_TOOL_RESPONSE;

  return (
    <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {labels.result}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type="dot"
          size="s"
          css={css`
            color: ${euiTheme.colors.textDisabled};
          `}
          aria-hidden={true}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink
          color="text"
          onClick={openFlyout}
          data-test-subj={linkTestSubj}
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: linkAction,
            detail: 'conversation',
          })}
        >
          {linkLabel}
        </EuiLink>
      </EuiFlexItem>
      {showSubAgentFlyout && isFlyoutOpen && (
        <SubAgentExecutionFlyout
          executionId={subAgentExecutionId!}
          params={step.params}
          onClose={closeFlyout}
        />
      )}
      {!showSubAgentFlyout && (
        <ToolResponseFlyout isOpen={isFlyoutOpen} onClose={closeFlyout}>
          {step.results.map((result, idx) => (
            <Fragment key={`flyout-result-${idx}`}>
              <ToolResult result={result} mode="flyout" />
              {idx < step.results.length - 1 && <EuiSpacer size="m" />}
            </Fragment>
          ))}
        </ToolResponseFlyout>
      )}
    </EuiFlexGroup>
  );
};

/**
 * Shape of `data` on a sub-agent tool result.
 */
interface SubAgentResultData {
  agent_execution_id?: string;
}

/**
 * Extracts the sub-agent execution id from a tool-call step. Looks in results
 * first (populated after the tool completes), then falls back to progression
 * metadata (set during execution by tool-progress events). Returns undefined
 * if neither carries it yet.
 */
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
