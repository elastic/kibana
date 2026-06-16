/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { StepLayout } from '../step_layout';
import { ToolCallStep } from './tool_call_step';

interface ToolCallGroupProps {
  steps: ToolCallStepData[];
}

export const ToolCallGroup: React.FC<ToolCallGroupProps> = ({ steps }) => {
  const { euiTheme } = useEuiTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const onToggle = () => setIsExpanded((v) => !v);

  const label = i18n.translate('xpack.agentBuilder.roundEvents.toolCallGroup.label', {
    defaultMessage: 'Ran {count, plural, one {# tool} other {# tools}}',
    values: { count: steps.length },
  });

  const expansionStyles = css`
    padding-left: ${euiTheme.size.s};
  `;

  return (
    <StepLayout
      label={
        <EuiText color="inherit">
          <p>{label}</p>
        </EuiText>
      }
      onClick={onToggle}
      isExpanded={isExpanded}
      expansion={
        <div css={expansionStyles}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {steps.map((step) => (
              <EuiFlexItem grow={false} key={step.tool_call_id}>
                <ToolCallStep step={step} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </div>
      }
    />
  );
};
