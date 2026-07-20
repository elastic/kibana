/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { ChatMessageText } from '../../round_response/chat_message_text';
import {
  OpencodeTimeline,
  type OpencodeTimelineItem,
} from '../../../../sandboxes/opencode_timeline';
import { SandboxExecutionsFlyout } from '../../../../sandboxes/sandbox_executions_flyout';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';

const labels = {
  title: i18n.translate('xpack.agentBuilder.opencodeSubagent.title', {
    defaultMessage: 'OpenCode coding sub-agent',
  }),
  sandbox: i18n.translate('xpack.agentBuilder.opencodeSubagent.sandbox', {
    defaultMessage: 'Sandboxed',
  }),
  inspect: i18n.translate('xpack.agentBuilder.opencodeSubagent.inspect', {
    defaultMessage: 'Inspect sandbox execution (cluster, pod, logs, run a command)',
  }),
  expand: i18n.translate('xpack.agentBuilder.opencodeSubagent.expand', {
    defaultMessage: 'Expand OpenCode details',
  }),
  collapse: i18n.translate('xpack.agentBuilder.opencodeSubagent.collapse', {
    defaultMessage: 'Collapse OpenCode details',
  }),
};

type TimelineItem = OpencodeTimelineItem;

interface OpencodeResultData {
  opencode_subagent?: boolean;
  status?: string;
  response?: string;
  timeline?: TimelineItem[];
  tool_calls?: string[];
}

/**
 * Detects whether a tool-call step is an OpenCode sub-agent run, from either the
 * result payload or the live progress metadata.
 */
export const isOpencodeSubagentStep = (step: ToolCallStepData): boolean => {
  if (step.results.some((r) => (r.data as OpencodeResultData | undefined)?.opencode_subagent)) {
    return true;
  }
  return Boolean(step.progression?.some((p) => p.metadata?.opencode_subagent === 'true'));
};

/**
 * OpenCode streams its final answer as message text, and with some models the
 * mid-run narration ("Those are just files… Now let me read…") leaks into that
 * text before the real, structured answer. Those sentences are already conveyed
 * by the Thinking / tool rows in the timeline, and they arrive un-punctuated
 * (e.g. "directory:The frontend…"), so we drop the narrative preamble and keep
 * the answer from its first structural marker (a heading or a "---" rule).
 */
const stripLeakedNarration = (response: string): string => {
  const trimmed = response.trim();
  // First real structure in the answer: a markdown heading or a horizontal rule.
  const structureMatch = trimmed.match(/(^|\n)\s*(#{1,6}\s|---\s*(\n|$))/);
  if (structureMatch && structureMatch.index !== undefined) {
    // Only treat as preamble if the leading prose looks like run-on narration
    // (long, and contains a tell-tale ":Word" chunk from concatenated chunks).
    const preamble = trimmed.slice(0, structureMatch.index);
    const looksLikeNarration =
      preamble.length > 120 && /[a-z]:[A-Z]/.test(preamble.replace(/\s+/g, ''));
    if (looksLikeNarration) {
      return trimmed
        .slice(structureMatch.index)
        .replace(/^\s*---\s*\n?/, '')
        .trim();
    }
  }
  return trimmed;
};

/**
 * True when the answer is *only* a restatement of the edited file, the command,
 * and its output — all of which the timeline already shows. Such answers (e.g.
 * "**Script:** `hello.py` <code> **Output:** <code>") are dropped so the card
 * doesn't duplicate the timeline. A response with real explanatory prose is kept.
 */
const isEchoOnlyResponse = (response: string): boolean => {
  const withoutCode = response.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
  const prose = withoutCode
    .split('\n')
    .map((line) => line.replace(/[*_#>-]/g, '').trim())
    // Drop bare label lines: "Script:", "File:", "Command:", "Run it with:", "Output:", …
    .filter(
      (line) =>
        line &&
        !/^(script|file|command|run(\s+it(\s+with)?)?|output|stdout|stderr|result)s?\b.*:?\s*$/i.test(
          line
        )
    )
    .join(' ')
    .trim();
  return prose.length < 24;
};

const getResultData = (step: ToolCallStepData): OpencodeResultData | undefined =>
  step.results.find((r) => (r.data as OpencodeResultData | undefined)?.opencode_subagent)?.data as
    | OpencodeResultData
    | undefined;

/**
 * Builds the activity timeline, upserting streamed items by id. Once the run
 * completes we use the final structured timeline from the result. While running,
 * each progress entry carries a JSON-serialized item under `metadata.item`; we
 * replay them in order so the latest state of each id wins (live view).
 */
const buildTimeline = (step: ToolCallStepData, result?: OpencodeResultData): TimelineItem[] => {
  if (result?.timeline?.length) {
    return result.timeline;
  }
  const byId = new Map<string, TimelineItem>();
  const order: string[] = [];
  for (const p of step.progression ?? []) {
    if (p.metadata?.opencode_subagent !== 'true') continue;
    const rawItem = p.metadata?.item;
    if (!rawItem) continue;
    try {
      const item = JSON.parse(rawItem) as TimelineItem;
      if (!byId.has(item.id)) order.push(item.id);
      byId.set(item.id, item);
    } catch {
      // ignore malformed progress entries
    }
  }
  return order.map((id) => byId.get(id)!).filter(Boolean);
};

export const OpencodeSubagentStep: React.FC<{ step: ToolCallStepData }> = ({ step }) => {
  const { euiTheme } = useEuiTheme();
  const result = getResultData(step);
  const isRunning = step.results.length === 0;
  const timeline = useMemo(() => buildTimeline(step, result), [step, result]);
  const responseProse = useMemo(() => {
    if (!result?.response) return '';
    if (isEchoOnlyResponse(result.response)) return '';
    return stripLeakedNarration(result.response);
  }, [result?.response]);
  const conversationId = useConversationId();
  const [inspectOpen, setInspectOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(isRunning);
  const hasDetails = timeline.length > 0 || Boolean(responseProse);

  useEffect(() => {
    setDetailsOpen(isRunning);
  }, [isRunning]);

  const cardStyles = css`
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: ${euiTheme.colors.backgroundBasePlain};
  `;

  // The sub-agent answer is rendered inside a compact card, so tame the markdown:
  // shrink headings to body-ish sizes and tighten vertical rhythm so a "## …"
  // heading doesn't blow up like a page title.
  const responseStyles = css`
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      font-size: ${euiTheme.size.base};
      font-weight: ${euiTheme.font.weight.bold};
      line-height: 1.4;
      margin-top: ${euiTheme.size.m};
      margin-bottom: ${euiTheme.size.xs};
    }
    p,
    ul,
    ol {
      margin-bottom: ${euiTheme.size.s};
    }
    hr {
      margin: ${euiTheme.size.s} 0;
    }
  `;

  return (
    <EuiPanel hasShadow={false} paddingSize="m" css={cardStyles}>
      {/* Header: OpenCode identity + live status */}
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiAvatar
            name="OpenCode"
            size="s"
            iconType="compute"
            color={euiTheme.colors.backgroundLightAccent}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>{labels.title}</strong>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={detailsOpen ? labels.collapse : labels.expand}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              size="s"
              iconType={detailsOpen ? 'arrowDown' : 'arrowRight'}
              aria-label={detailsOpen ? labels.collapse : labels.expand}
              onClick={() => setDetailsOpen((open) => !open)}
              isDisabled={!hasDetails}
              data-test-subj="agentBuilderOpencodeDetailsToggle"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={labels.inspect} disableScreenReaderOutput>
            <button
              type="button"
              onClick={() => setInspectOpen(true)}
              disabled={!conversationId}
              aria-label={labels.inspect}
              data-test-subj="agentBuilderSandboxedInspectButton"
              css={css`
                display: inline-flex;
                align-items: center;
                gap: ${euiTheme.size.xs};
                background: none;
                border: none;
                padding: 2px 4px;
                border-radius: ${euiTheme.border.radius.small};
                cursor: ${conversationId ? 'pointer' : 'default'};
                color: ${euiTheme.colors.textSubdued};
                &:hover:not(:disabled) {
                  color: ${euiTheme.colors.textPrimary};
                  background: ${euiTheme.colors.backgroundBaseInteractiveHover};
                  text-decoration: underline;
                }
              `}
            >
              <EuiIcon type="lock" size="s" />
              <EuiText size="xs" color="inherit">
                {labels.sandbox}
              </EuiText>
            </button>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isRunning ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiIcon type="checkInCircleFilled" color="success" size="m" />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {detailsOpen && (
        <>
          {/* Activity timeline */}
          {timeline.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <OpencodeTimeline timeline={timeline} autoExpand={isRunning} />
            </>
          )}

          {/* Final response — only the prose that adds meaning beyond the timeline.
              The timeline is the single source of truth for the edited file, the
              command, and its output, so those echoes are stripped to avoid the
              "shows twice" duplication the user reported. */}
          {responseProse && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" css={responseStyles}>
                <ChatMessageText content={responseProse} steps={[]} />
              </EuiText>
            </>
          )}
        </>
      )}

      {inspectOpen && conversationId && (
        <SandboxExecutionsFlyout
          conversationId={conversationId}
          onClose={() => setInspectOpen(false)}
        />
      )}
    </EuiPanel>
  );
};
