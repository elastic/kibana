/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { SVGAttributes } from 'react';
import type { SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ConversationRoundStep, ExecutionTerminatedEvent } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useTracingEnabled } from '../../../../hooks/use_tracing_enabled';
import { useAgentId } from '../../../../hooks/use_conversation';
import { useConversationId } from '../../../../context/conversation/use_conversation_id';
import { ExecutionMetadataPopover } from './execution_metadata_popover';
import { TraceButton } from './trace_button';
import { FeedbackActions } from './feedback_actions';

const copyLabels = {
  response: i18n.translate('xpack.agentBuilder.responseActions.copy', {
    defaultMessage: 'Copy response',
  }),
  prompt: i18n.translate('xpack.agentBuilder.responseActions.copyPrompt', {
    defaultMessage: 'Copy prompt',
  }),
} as const;

const copiedLabel = i18n.translate('xpack.agentBuilder.responseActions.copied', {
  defaultMessage: 'Copied',
});

// POC: same hold as EuiCodeBlock `isCopyable`.
const COPY_CHECK_HOLD_MS = 750;

const CopyCheckContext = React.createContext(false);

const CopyCheckIcon: React.FC<
  SVGAttributes<SVGElement> & { css?: SerializedStyles | SerializedStyles[] }
> = ({ css: iconCss, ...rest }) => {
  const showCheck = useContext(CopyCheckContext);
  const { euiTheme } = useEuiTheme();
  const speed = euiTheme.animation.normal;

  const frameStyles = css`
    position: relative;
    display: block;
    inline-size: 100%;
    block-size: 100%;
  `;
  const layerStyles = css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    ${euiCanAnimate} {
      transition: opacity ${speed} ease-in-out, filter ${speed} ease-in-out,
        transform ${speed} ease-in-out;
    }
  `;
  const visibleStyles = css`
    opacity: 1;
    filter: blur(0);
    transform: scale(1);
  `;
  const hiddenStyles = css`
    opacity: 0;
    filter: blur(2px);
    transform: scale(0.25);
  `;

  return (
    <span {...rest} css={iconCss}>
      <span css={frameStyles}>
        <span css={[layerStyles, showCheck ? hiddenStyles : visibleStyles]}>
          <EuiIcon type="copy" color="inherit" aria-hidden={true} />
        </span>
        <span css={[layerStyles, showCheck ? visibleStyles : hiddenStyles]}>
          <EuiIcon type="check" color="inherit" aria-hidden={true} />
        </span>
      </span>
    </span>
  );
};

const CopyCheckButton: React.FC<{
  copy: () => void;
  copyCount: number;
  label: string;
}> = ({ copy, copyCount, label }) => {
  const [showCheck, setShowCheck] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    if (!copyCount) return;
    setShowCheck(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShowCheck(false), COPY_CHECK_HOLD_MS);
  }, [copyCount]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <CopyCheckContext.Provider value={showCheck}>
      <EuiButtonIcon
        onClick={copy}
        iconType={CopyCheckIcon}
        color="text"
        aria-label={label}
        data-test-subj="responseCopyButton"
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.COPY_RESPONSE,
          detail: 'conversation',
        })}
      />
    </CopyCheckContext.Provider>
  );
};

interface ResponseActionsProps {
  content: string;
  isVisible: boolean;
  /** Present for a completed execution; enables the trace button and the metadata popover. */
  executionTerminatedEvent?: ExecutionTerminatedEvent;
  steps?: ConversationRoundStep[];
  /** Which side of the exchange `content` comes from, so the copy wording matches it. */
  copyTarget?: keyof typeof copyLabels;
  /** When set, renders the thumbs up/down feedback buttons. */
  executionId?: string;
}

export const ResponseActions: React.FC<ResponseActionsProps> = ({
  content,
  isVisible,
  executionTerminatedEvent,
  steps,
  copyTarget = 'response',
  executionId,
}) => {
  const { euiTheme } = useEuiTheme();
  const isTracingEnabled = useTracingEnabled();
  const conversationId = useConversationId();
  const agentId = useAgentId();

  const copyLabel = copyLabels[copyTarget];

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
        <EuiCopy
          textToCopy={content}
          beforeMessage={copyLabel}
          afterMessage={copiedLabel}
          tooltipProps={{ disableScreenReaderOutput: true }}
        >
          {(copy, _isCopied, copyCount) => (
            <CopyCheckButton
              copy={copy}
              copyCount={copyCount}
              label={copyLabel}
            />
          )}
        </EuiCopy>
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
            conversationId={conversationId}
            agentId={agentId}
          />
        </EuiFlexItem>
      )}
      {executionId && (
        <EuiFlexItem grow={false}>
          <FeedbackActions executionId={executionId} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
