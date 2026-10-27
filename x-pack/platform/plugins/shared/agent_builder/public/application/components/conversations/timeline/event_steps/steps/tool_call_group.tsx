/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { getEbtProps } from '@kbn/ebt-click';
import { useMotionRefreshSettings } from '@kbn/react-kibana-context-root';
import { ShimmeringText } from '../../shimmering_text';
import { ToolCallStep } from './tool_call_step';

interface ToolCallGroupProps {
  steps: ToolCallStepData[];
  isAborted?: boolean;
}

export const ToolCallGroup: React.FC<ToolCallGroupProps> = ({ steps, isAborted = false }) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const { shimmer } = useMotionRefreshSettings();
  const allRan = steps.every((s) => s.results.length > 0);
  const hasError = steps.some((s) => s.results.some(isErrorResult));
  const runningLabel = i18n.translate('xpack.agentBuilder.eventSteps.toolCallGroup.running', {
    defaultMessage: '{count, plural, one {# tool running…} other {# tools running…}}',
    values: { count: steps.length },
  });

  const label = (
    <EuiText size="s" color={hasError ? 'danger' : 'inherit'}>
      <p role="status">
        {allRan ? (
          <FormattedMessage
            id="xpack.agentBuilder.eventSteps.toolCallGroup.ran"
            defaultMessage="{count, plural, one {# tool ran} other {# tools ran}}"
            values={{ count: steps.length }}
          />
        ) : isAborted ? (
          <FormattedMessage
            id="xpack.agentBuilder.eventSteps.toolCallGroup.stopped"
            defaultMessage="{count, plural, one {# tool stopped} other {# tools stopped}}"
            values={{ count: steps.length }}
          />
        ) : shimmer ? (
          <ShimmeringText text={runningLabel} />
        ) : (
          runningLabel
        )}
      </p>
    </EuiText>
  );

  const buttonStyles = css`
    padding: 0;
    line-height: inherit;
    font-weight: ${euiTheme.font.weight.regular};
    color: ${hasError
      ? euiTheme.colors.textDanger
      : isExpanded
      ? euiTheme.colors.textParagraph
      : euiTheme.colors.textDisabled};
    &:hover,
    &:focus {
      text-decoration: none;
      color: ${hasError ? euiTheme.colors.textDanger : euiTheme.colors.textParagraph};
    }
  `;

  return (
    <EuiAccordion
      id={`agentBuilderToolGroup-${steps[0].tool_call_id}`}
      arrowDisplay="right"
      borders="none"
      forceState={isExpanded ? 'open' : 'closed'}
      onToggle={(isOpen) => setIsExpanded(isOpen)}
      buttonContent={label}
      buttonProps={{
        css: buttonStyles,
        ...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_TOOL_CALL_GROUP,
          detail: 'conversation',
        }),
      }}
      data-test-subj="agentBuilderToolCallGroup"
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        css={css`
          padding-top: ${euiTheme.size.s};
        `}
      >
        {steps.map((step) => (
          <EuiFlexItem grow={false} key={step.tool_call_id}>
            <ToolCallStep step={step} isAborted={isAborted} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
