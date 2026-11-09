/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { ToolCallStep } from './tool_call_step';

interface ToolCallGroupProps {
  steps: ToolCallStepData[];
  isAborted?: boolean;
}

export const ToolCallGroup: React.FC<ToolCallGroupProps> = ({ steps, isAborted = false }) => {
  const { euiTheme } = useEuiTheme();
  const accordionId = useGeneratedHtmlId({ prefix: 'agentBuilderToolCallGroup' });
  const [isExpanded, setIsExpanded] = useState(false);

  const allRan = steps.every((s) => s.results.length > 0);
  const hasError = steps.some((s) => s.results.some(isErrorResult));
  const labelColor = hasError
    ? euiTheme.colors.danger
    : isExpanded
      ? euiTheme.colors.textParagraph
      : euiTheme.colors.textDisabled;

  const label = (
    <EuiText size="s" component="span" color={hasError ? 'danger' : 'inherit'}>
      <span role="status">
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
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.eventSteps.toolCallGroup.running"
            defaultMessage="{count, plural, one {# tool running…} other {# tools running…}}"
            values={{ count: steps.length }}
          />
        )}
      </span>
    </EuiText>
  );

  return (
    <div data-test-subj="agentBuilderToolCallGroup">
      <EuiAccordion
        id={accordionId}
        arrowDisplay="right"
        paddingSize="none"
        forceState={isExpanded ? 'open' : 'closed'}
        onToggle={setIsExpanded}
        buttonContent={label}
        buttonProps={{
          // POC: keep the arrow beside the label, and the quiet step color.
          css: css`
            &&,
            &&:hover,
            &&:focus {
              flex-grow: 0;
              width: auto;
              text-decoration: none;
              color: ${labelColor};
            }
            &&:hover,
            &&:focus {
              color: ${hasError ? euiTheme.colors.danger : euiTheme.colors.textParagraph};
            }
          `,
          ...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_TOOL_CALL_GROUP,
            detail: 'conversation',
          }),
        }}
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          css={css`
            padding-block-start: ${euiTheme.size.s};
          `}
        >
          {steps.map((step) => (
            <EuiFlexItem grow={false} key={step.tool_call_id}>
              <ToolCallStep step={step} isAborted={isAborted} />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiAccordion>
    </div>
  );
};
