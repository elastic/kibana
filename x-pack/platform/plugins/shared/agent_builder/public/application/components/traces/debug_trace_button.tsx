/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useExperimentalFeatures } from '../../hooks/use_experimental_features';
import { useNavigation } from '../../hooks/use_navigation';
import { useTracingEnabled } from '../../hooks/use_tracing_enabled';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';

interface DebugTraceButtonProps {
  traceId: string;
  size?: 's' | 'm';
  fill?: boolean;
}

/**
 * Builds the prompt that hands a trace to the Elastic AI Agent.
 *
 * Kept as a plain function so a unit test can assert the exact wording without
 * mounting React. The prompt is deliberately explicit about using the built-in
 * `agent-builder-traces` skill because that is what makes span retrieval work
 * without further user input.
 */
export const buildDebugTracePrompt = (traceId: string): string =>
  i18n.translate('xpack.agentBuilder.traces.debugPrompt', {
    defaultMessage:
      'Debug Agent Builder trace `{traceId}`. Use the agent-builder-traces skill to fetch all spans for this trace, then identify which span failed or looped and explain the likely root cause. Reference specific span names (e.g. execute_tool, chat, invoke_agent) in your answer.',
    values: { traceId },
  });

/**
 * "Debug trace with agent" action. Starts a new conversation with the default
 * Elastic AI Agent (`elastic-ai-agent`) and prefills the composer with a
 * trace-debugging prompt via the existing `initialMessage` router state plumbing
 * (see `use_initial_message.ts`).
 *
 * We pass `autoSendInitialMessage: false` on purpose — the prompt lands in the
 * editor so the user can review or tweak the wording before sending, rather than
 * kicking off an LLM call the moment they click the button.
 *
 * The button only renders when tracing AND experimental features are enabled: the
 * default agent is only granted the `agent-builder-traces` skill under those same
 * conditions, so hiding it elsewhere avoids handing the user an agent that cannot
 * actually fetch spans. (The client has no dedicated `skills` flag, so the umbrella
 * experimental-features setting is the proxy for it.)
 */
export const DebugTraceButton: React.FC<DebugTraceButtonProps> = ({
  traceId,
  size = 's',
  fill = false,
}) => {
  const { navigateToAgentBuilderUrl } = useNavigation();
  const isTracingEnabled = useTracingEnabled();
  const isExperimentalEnabled = useExperimentalFeatures();

  const handleClick = useCallback(() => {
    navigateToAgentBuilderUrl(
      appPaths.agent.conversations.new({ agentId: agentBuilderDefaultAgentId }),
      undefined,
      {
        initialMessage: buildDebugTracePrompt(traceId),
        autoSendInitialMessage: false,
      }
    );
  }, [navigateToAgentBuilderUrl, traceId]);

  if (!isTracingEnabled || !isExperimentalEnabled) {
    return null;
  }

  return (
    <EuiToolTip content={labels.traces.debugWithAgentTooltip}>
      <EuiButton
        size={size}
        iconType="sparkles"
        onClick={handleClick}
        fill={fill}
        data-test-subj="agentBuilderDebugTraceButton"
      >
        {labels.traces.debugWithAgentButton}
      </EuiButton>
    </EuiToolTip>
  );
};
