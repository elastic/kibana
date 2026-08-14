/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { buildAgentBuilderTracesIndexPattern } from '../../../../common/traces';
import { useKibana } from '../../hooks/use_kibana';
import { useSpaceId } from '../../hooks/use_space_id';
import { labels } from '../../utils/i18n';
import { DebugTraceButton } from './debug_trace_button';

/**
 * A conversation round paired with the round's normalised trace id. The backend
 * types `trace_id` as `string | string[]` (multi-trace rounds are reserved for
 * the future), so we always pick the first id — matching how `RoundResponseActions`
 * treats the field today.
 */
interface RoundTraceEntry {
  roundIndex: number;
  round: ConversationRound;
  traceId: string;
}

interface ConversationTracesFlyoutProps {
  rounds: readonly ConversationRound[];
  onClose: () => void;
}

const flyoutCss = css`
  z-index: ${euiThemeVars.euiZFlyout + 4};
  .euiFlyoutBody__overflowContent {
    height: 100%;
    padding: 0;
  }
  .euiFlyoutBody__overflow {
    overflow: hidden;
  }
`;

const previewOfMessage = (message: string | undefined, empty: string): string => {
  const trimmed = (message ?? '').trim();
  if (!trimmed) return empty;
  return trimmed.length > 80 ? `${trimmed.slice(0, 77).trimEnd()}…` : trimmed;
};

/**
 * Flyout that lists every round of the current conversation that produced a trace
 * and lets the user drill into any one of them without leaving the conversation.
 *
 * Two internal views:
 *   1. `list` (default): one row per round with a trace, showing the user prompt
 *      preview and the trace ID.
 *   2. `detail`: full-height `TraceWaterfall` for the selected trace, with a
 *      "Back to traces" affordance and a `DebugTraceButton`.
 *
 * Deliberately renders inside a single flyout (rather than opening a nested
 * `RoundTraceFlyout` on top) because stacking flyouts is fiddly in EUI and the
 * list view is only useful long enough for the user to pick a row.
 */
export const ConversationTracesFlyout: React.FC<ConversationTracesFlyoutProps> = ({
  rounds,
  onClose,
}) => {
  const { services } = useKibana();
  const { data, spaces } = services.plugins;
  const spaceId = useSpaceId(spaces);

  const entries = useMemo<RoundTraceEntry[]>(
    () =>
      rounds.flatMap((round, roundIndex) => {
        const raw = round.trace_id;
        const traceId = Array.isArray(raw) ? raw[0] : raw;
        if (!traceId) return [];
        return [{ round, roundIndex, traceId }];
      }),
    [rounds]
  );

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.traceId === selectedTraceId) ?? null,
    [entries, selectedTraceId]
  );

  const tracesIndex = useMemo(
    () => (spaceId ? buildAgentBuilderTracesIndexPattern(spaceId) : undefined),
    [spaceId]
  );
  // `useTraceSpans` is only active while a trace is selected — we do not want a
  // list of 10 traces to fire 10 background searches on open.
  const fetchTrace = useMemo(
    () =>
      tracesIndex
        ? createEsTraceFetcher(data.search.search, { index: tracesIndex })
        : createEsTraceFetcher(data.search.search),
    [data.search.search, tracesIndex]
  );
  const spanResult = useTraceSpans(selectedTraceId, {
    fetchTrace,
    index: tracesIndex,
    enabled: selectedTraceId !== null,
  });

  const handleBack = useCallback(() => setSelectedTraceId(null), []);

  const renderHeader = () => {
    if (selectedEntry) {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="arrowLeft"
              onClick={handleBack}
              flush="left"
              data-test-subj="agentBuilderConversationTracesBackButton"
            >
              {labels.traces.backToList}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 style={{ wordBreak: 'break-all' }}>
                {labels.traces.roundTraceHeading(selectedEntry.roundIndex + 1)}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DebugTraceButton traceId={selectedEntry.traceId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{labels.traces.conversationTracesTitle}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {labels.traces.tracesCount(entries.length)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const renderBody = () => {
    if (selectedEntry) {
      return (
        <div style={{ height: '100%', padding: 16 }}>
          <TraceWaterfall
            spans={spanResult.spans}
            traceId={selectedEntry.traceId}
            durationMs={spanResult.durationMs}
            isLoading={spanResult.isLoading}
            error={spanResult.error}
          />
        </div>
      );
    }

    if (!entries.length) {
      return (
        <div style={{ padding: 16 }}>
          <EuiEmptyPrompt
            iconType="help"
            title={<h3>{labels.traces.noConversationTracesTitle}</h3>}
            body={<p>{labels.traces.noConversationTracesMessage}</p>}
            data-test-subj="agentBuilderConversationTracesEmpty"
          />
        </div>
      );
    }

    return (
      <div style={{ padding: 16 }} data-test-subj="agentBuilderConversationTracesList">
        <EuiFlexGroup direction="column" gutterSize="s">
          {entries.map((entry) => {
            const preview = previewOfMessage(
              entry.round.input?.message,
              labels.traces.emptyMessagePreview
            );
            return (
              <EuiFlexItem grow={false} key={entry.traceId}>
                <EuiPanel
                  hasBorder
                  hasShadow={false}
                  paddingSize="s"
                  onClick={() => setSelectedTraceId(entry.traceId)}
                  data-test-subj="agentBuilderConversationTracesListItem"
                  aria-label={entry.traceId}
                >
                  <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                    <EuiFlexItem>
                      <EuiText size="s">
                        <strong>{labels.traces.turnLabel(entry.roundIndex + 1)}</strong> {preview}
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <EuiText size="xs" color="subdued">
                        <EuiCode transparentBackground>{entry.traceId}</EuiCode>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </div>
    );
  };

  return (
    <EuiFlyoutResizable
      onClose={onClose}
      aria-labelledby="agentBuilderConversationTracesFlyoutTitle"
      size={620}
      minWidth={400}
      maxWidth={1200}
      ownFocus={false}
      css={flyoutCss}
      data-test-subj="agentBuilderConversationTracesFlyout"
    >
      <EuiFlyoutHeader hasBorder>{renderHeader()}</EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
