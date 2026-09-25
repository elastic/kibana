/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import copy from 'copy-to-clipboard';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ConversationRoundStep, ExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useToasts } from '../../../../hooks/use_toasts';
import { useTracingEnabled } from '../../../../hooks/use_tracing_enabled';
import { ExecutionMetadataPopover } from './execution_metadata_popover';
import { TraceButton } from './trace_button';

const copyLabels = {
  response: {
    action: i18n.translate('xpack.agentBuilder.responseActions.copy', {
      defaultMessage: 'Copy response',
    }),
    success: i18n.translate('xpack.agentBuilder.responseActions.copySuccess', {
      defaultMessage: 'Response copied to clipboard',
    }),
  },
  prompt: {
    action: i18n.translate('xpack.agentBuilder.responseActions.copyPrompt', {
      defaultMessage: 'Copy prompt',
    }),
    success: i18n.translate('xpack.agentBuilder.responseActions.copyPromptSuccess', {
      defaultMessage: 'Prompt copied to clipboard',
    }),
  },
} as const;

interface ResponseActionsProps {
  content: string;
  isVisible: boolean;
  /** Present for a completed execution; enables the trace button and the metadata popover. */
  executionTerminatedEvent?: ExecutionTerminatedEvent;
  steps?: ConversationRoundStep[];
  /** Which side of the exchange `content` comes from, so the copy wording matches it. */
  copyTarget?: keyof typeof copyLabels;
}

export const ResponseActions: React.FC<ResponseActionsProps> = ({
  content,
  isVisible,
  executionTerminatedEvent,
  steps,
  copyTarget = 'response',
}) => {
  const { addSuccessToast } = useToasts();
  const { euiTheme } = useEuiTheme();
  const isTracingEnabled = useTracingEnabled();

  const { action: copyLabel, success: copySuccessLabel } = copyLabels[copyTarget];

  const handleCopy = useCallback(() => {
    const isSuccess = copy(content);
    if (isSuccess) {
      addSuccessToast(copySuccessLabel);
    }
  }, [content, addSuccessToast, copySuccessLabel]);

  // Normalise trace_id — backend models it as `string | string[]` to keep the
  // door open for multi-trace executions; only the first id is meaningful today.
  const traceId = useMemo(() => {
    const id = executionTerminatedEvent?.data.trace_id;
    if (!id) return undefined;
    return Array.isArray(id) ? id[0] : id;
  }, [executionTerminatedEvent?.data.trace_id]);

  const showTraceButton = isTracingEnabled && Boolean(traceId);

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="flexStart"
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={css`
        opacity: ${isVisible ? 1 : 0};
        transition: opacity 0.2s ease;
        .euiButtonIcon,
        .euiButtonEmpty {
          color: ${euiTheme.colors.textDisabled};
        }
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiToolTip content={copyLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="copy"
            aria-label={copyLabel}
            onClick={handleCopy}
            color="text"
            data-test-subj="responseCopyButton"
            {...getEbtProps({
              element: AGENT_BUILDER_UI_EBT.element.pageContent,
              action: AGENT_BUILDER_UI_EBT.action.conversation.COPY_RESPONSE,
              detail: 'conversation',
            })}
          />
        </EuiToolTip>
      </EuiFlexItem>
      {showTraceButton && traceId && (
        <EuiFlexItem grow={false}>
          <TraceButton traceId={traceId} />
        </EuiFlexItem>
      )}
      {executionTerminatedEvent && (
        <EuiFlexItem grow={false}>
          <ExecutionMetadataPopover
            executionTerminatedEvent={executionTerminatedEvent}
            steps={steps}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
