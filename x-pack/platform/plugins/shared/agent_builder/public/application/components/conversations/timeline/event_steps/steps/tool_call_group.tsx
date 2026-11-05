/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ShimmeringText } from '@kbn/custom-content-renderer';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { isErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { StepLayout } from '../step_layout';
import { useChatStatusShimmer } from '../../use_chat_status_shimmer';
import { ToolCallStep } from './tool_call_step';

interface ToolCallGroupProps {
  steps: ToolCallStepData[];
  isAborted?: boolean;
}

export const ToolCallGroup: React.FC<ToolCallGroupProps> = ({ steps, isAborted = false }) => {
  const chatShimmer = useChatStatusShimmer();
  const [isExpanded, setIsExpanded] = useState(false);
  const onToggle = () => setIsExpanded((v) => !v);

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
        ) : (
          <ShimmeringText text={runningLabel} enabled={chatShimmer && !hasError} />
        )}
      </p>
    </EuiText>
  );

  return (
    <div data-test-subj="agentBuilderToolCallGroup">
      <StepLayout
        label={label}
        onClick={onToggle}
        isExpanded={isExpanded}
        expansion={
          <EuiFlexGroup direction="column" gutterSize="s">
            {steps.map((step) => (
              <EuiFlexItem grow={false} key={step.tool_call_id}>
                <ToolCallStep step={step} isAborted={isAborted} shimmerStatus={false} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        }
        ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_TOOL_CALL_GROUP}
      />
    </div>
  );
};
