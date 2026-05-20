/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBadge, EuiCodeBlock, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { internalTools } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult as ToolResultData } from '@kbn/agent-builder-common/tools/tool_result';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { StepLayout } from '../step_layout';
import { ToolResult, isInlineRenderableResult } from '../results/tool_result';
import { ViewResponseButton } from '../results/view_response_button';
import { ViewExecutionButton } from '../results/view_execution_button';

const labels = {
  toolCall: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.ariaLabel', {
    defaultMessage: 'Tool call',
  }),
  parameters: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.parametersLabel', {
    defaultMessage: 'Parameters',
  }),
  progression: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.progressionLabel', {
    defaultMessage: 'Progression',
  }),
  result: i18n.translate('xpack.agentBuilder.roundEvents.steps.toolCall.resultLabel', {
    defaultMessage: 'Result',
  }),
};

const codeblockStyles = css`
  word-break: break-word;
`;

interface ToolCallStepProps {
  step: ToolCallStepData;
}

/**
 * Renders a `ToolCallStep`. Clickable to expand into sub-fields:
 *   - Parameters (JSON)
 *   - Progression (each ToolCallProgress.message)
 *   - Result (inline-renderable types inline; non-inline types via View response button)
 *
 * Expansion state is local to this component — there's no shared map across
 * the round, since no caller needs to know which steps are expanded.
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
    />
  );
};

interface ToolCallHeadlineProps {
  step: ToolCallStepData;
  hasResults: boolean;
}

const ToolCallHeadline: React.FC<ToolCallHeadlineProps> = ({ step, hasResults }) => {
  const { tool_id: toolId } = step;

  // If any of the tool's results is an `error` result, render the headline
  // in danger color so a failing step is immediately visible at a glance.
  const hasErrorResult = step.results.some(isErrorResult);

  // Tool name rendered as an EuiBadge with a wrench icon. Not clickable —
  // the entire row (handled by StepLayout) is the click target that expands
  // the step's sub-fields.
  const toolNode = (
    <EuiBadge
      iconType="wrench"
      color={hasErrorResult ? 'danger' : 'default'}
      css={css`
        vertical-align: inherit;
      `}
    >
      {toolId}
    </EuiBadge>
  );

  return (
    <EuiText color={hasErrorResult ? 'danger' : 'inherit'}>
      <p role="status" aria-label={labels.toolCall}>
        {hasResults ? (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.toolCall.responded"
            defaultMessage="Tool {tool} responded"
            values={{ tool: toolNode }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.roundEvents.steps.toolCall.calling"
            defaultMessage="Calling tool {tool}"
            values={{ tool: toolNode }}
          />
        )}
      </p>
    </EuiText>
  );
};

interface ToolCallExpansionProps {
  step: ToolCallStepData;
}

const ToolCallExpansion: React.FC<ToolCallExpansionProps> = ({ step }) => {
  const { euiTheme } = useEuiTheme();
  const sectionStyles = css`
    padding-bottom: ${euiTheme.size.s};
  `;

  const inlineResults = step.results.filter(isInlineRenderableResult);
  const flyoutResults = step.results.filter((r: ToolResultData) => !isInlineRenderableResult(r));

  // Sub-agent invocations get a "View execution" affordance that opens the
  // rich SubAgentExecutionFlyout (nested steps + final response) instead of
  // the generic ToolResponseFlyout (JSON dump). The execution_id is available
  // from results once the sub-agent completes, or from progression metadata
  // while it's still running — we look in both.
  const isSubAgentCall = step.tool_id === internalTools.subAgentTool;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;

  const hasInlineResults = inlineResults.length > 0;
  const hasFlyoutResults = flyoutResults.length > 0;
  const showResultSection = isSubAgentCall
    ? Boolean(subAgentExecutionId)
    : hasInlineResults || hasFlyoutResults;

  return (
    <>
      {/* Parameters */}
      <div css={sectionStyles}>
        <EuiText size="xs" color="subdued">
          <strong>{labels.parameters}</strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiCodeBlock language="json" paddingSize="s" fontSize="s" isCopyable css={codeblockStyles}>
          {JSON.stringify(step.params, null, 2)}
        </EuiCodeBlock>
      </div>

      {/* Progression */}
      {step.progression && step.progression.length > 0 && (
        <div css={sectionStyles}>
          <EuiText size="xs" color="subdued">
            <strong>{labels.progression}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {step.progression.map((p, idx) => (
            <EuiText key={`progression-${idx}`} size="s">
              <p>{p.message}</p>
            </EuiText>
          ))}
        </div>
      )}

      {/* Result(s) */}
      {showResultSection && (
        <div css={sectionStyles}>
          <EuiText size="xs" color="subdued">
            <strong>{labels.result}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          {isSubAgentCall ? (
            <ViewExecutionButton executionId={subAgentExecutionId!} params={step.params} />
          ) : (
            <>
              {inlineResults.map((result, idx) => (
                <React.Fragment key={`inline-result-${idx}`}>
                  <ToolResult result={result} mode="inline" />
                  {idx < inlineResults.length - 1 && <EuiSpacer size="s" />}
                </React.Fragment>
              ))}
              {hasInlineResults && hasFlyoutResults && <EuiSpacer size="s" />}
              {hasFlyoutResults && <ViewResponseButton results={flyoutResults} />}
            </>
          )}
        </div>
      )}
    </>
  );
};

/**
 * Shape of `data` on a sub-agent tool result. Defined locally so this module
 * doesn't depend on `round_thinking/`'s now-deleted helpers.
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
