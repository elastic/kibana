/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SpanDetail, type SpanNode, type TraceSpan } from '@kbn/llm-trace-waterfall';
import { labels } from '../../utils/i18n';
import { buildSpanTree, flattenSpanTree } from './build_span_tree';

interface SpanTreeViewProps {
  spans: TraceSpan[];
  isLoading?: boolean;
  error?: Error | null;
}

/**
 * "Tree" view of a trace: a deterministic parent-child list of spans with a side panel
 * that renders `SpanDetail` for the currently selected span. This is the lighter-weight
 * counterpart to the waterfall — no timing math, just the span hierarchy plus status.
 */
export const SpanTreeView: React.FC<SpanTreeViewProps> = ({
  spans,
  isLoading = false,
  error = null,
}) => {
  const flatSpans = useMemo(() => flattenSpanTree(buildSpanTree(spans)), [spans]);
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  const selectedSpan = useMemo(
    () => flatSpans.find((s) => s.span_id === selectedSpanId) ?? null,
    [flatSpans, selectedSpanId]
  );

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return <EuiCallOut title={error.message} color="danger" iconType="error" announceOnMount />;
  }

  if (!spans.length) {
    return (
      <EuiEmptyPrompt
        iconType="help"
        title={<h3>{labels.traces.emptyStateTitle}</h3>}
        body={<p>{labels.traces.emptyStateMessage}</p>}
        data-test-subj="agentBuilderSpanTreeEmpty"
      />
    );
  }

  const listStyle = css`
    height: 100%;
    overflow-y: auto;
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      style={{ height: '100%' }}
      data-test-subj="agentBuilderSpanTreeView"
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {`${flatSpans.length} spans`}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: 0 }}>
        <EuiFlexGroup direction="row" gutterSize="s" style={{ height: '100%' }}>
          <EuiFlexItem>
            <div css={listStyle} data-test-subj="agentBuilderSpanTreeList">
              {flatSpans.map((node) => (
                <SpanTreeRow
                  key={node.span_id}
                  node={node}
                  isSelected={node.span_id === selectedSpanId}
                  onSelect={() =>
                    setSelectedSpanId((prev) => (prev === node.span_id ? null : node.span_id))
                  }
                />
              ))}
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            {selectedSpan ? (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <SpanDetail span={selectedSpan} onClose={() => setSelectedSpanId(null)} useTabs />
              </div>
            ) : (
              <EuiPanel hasBorder color="subdued" paddingSize="m">
                <EuiText size="s" color="subdued">
                  {labels.traces.treeEmptyPanelMessage}
                </EuiText>
              </EuiPanel>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface SpanTreeRowProps {
  node: SpanNode;
  isSelected: boolean;
  onSelect: () => void;
}

const isErrorStatus = (status?: string): boolean => {
  if (!status) return false;
  const normalized = status.toUpperCase();
  return normalized === 'ERROR' || normalized === 'STATUS_CODE_ERROR';
};

const SpanTreeRow: React.FC<SpanTreeRowProps> = ({ node, isSelected, onSelect }) => {
  const { euiTheme } = useEuiTheme();
  const fontSizeXs = useEuiFontSize('xs');
  const hasError = isErrorStatus(node.status);
  const indentStep = parseInt(euiTheme.size.base, 10);
  const rowStyle = css`
    ${fontSizeXs}
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    padding-inline-start: ${node.depth * indentStep + parseInt(euiTheme.size.s, 10)}px;
    border-inline-start: ${euiTheme.border.width.thick} solid
      ${hasError ? euiTheme.colors.danger : 'transparent'};
    background: ${isSelected ? euiTheme.colors.backgroundBaseInteractiveSelect : 'transparent'};
    cursor: pointer;
    font-family: ${euiTheme.font.familyCode};
    &:hover {
      background: ${isSelected
        ? euiTheme.colors.backgroundBaseInteractiveSelect
        : euiTheme.colors.backgroundBaseInteractiveHover};
    }
  `;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      css={rowStyle}
      data-test-subj="agentBuilderSpanTreeRow"
      aria-pressed={isSelected}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {node.name}
      </span>
      <span style={{ color: euiTheme.colors.subduedText, whiteSpace: 'nowrap' }}>
        {`${(node.duration_ms ?? 0).toFixed(1)}ms`}
      </span>
      {hasError && <EuiBadge color="danger">{labels.traces.spanStatusError}</EuiBadge>}
    </div>
  );
};
