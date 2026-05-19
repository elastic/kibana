/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SubAgentExecutionFlyout } from '../flyouts/sub_agent_execution_flyout';

const buttonLabel = i18n.translate('xpack.agentBuilder.roundEvents.results.viewExecution', {
  defaultMessage: 'View execution',
});

interface ViewExecutionButtonProps {
  executionId: string;
  /**
   * Optional originating tool-call params (description / effort / prompt).
   * Rendered as a JSON block at the top of the flyout for context. Omit when
   * opening the flyout from a `BackgroundAgentCompleteStep` that doesn't have
   * direct access to the tool-call params.
   */
  params?: Record<string, unknown>;
}

/**
 * Button that opens `SubAgentExecutionFlyout` for a sub-agent execution.
 *
 * Used in two places:
 *   1. `tool_call_step.tsx` — when a `ToolCallStep` is a sub-agent invocation
 *      (`tool_id === internalTools.subAgentTool`), this replaces the generic
 *      `ViewResponseButton` so the user gets the rich nested-steps + final
 *      response view instead of a JSON dump.
 *   2. `background_agent_step.tsx` — the equivalent affordance on the
 *      completion event.
 *
 * The flyout is a strict superset of what the generic `ViewResponseButton`
 * would have shown: same final response, plus the trace of how the sub-agent
 * got there.
 */
export const ViewExecutionButton: React.FC<ViewExecutionButtonProps> = ({
  executionId,
  params,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <EuiButtonEmpty iconType="popout" size="s" onClick={() => setIsOpen(true)} flush="left">
        {buttonLabel}
      </EuiButtonEmpty>
      {isOpen && (
        <SubAgentExecutionFlyout
          executionId={executionId}
          params={params}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
