/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiCode,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { createEsTraceFetcher, TraceWaterfall, useTraceSpans } from '@kbn/llm-trace-waterfall';
import { buildAgentBuilderTracesIndexPattern } from '../../../../common/traces';
import { useKibana } from '../../hooks/use_kibana';
import { useNavigation } from '../../hooks/use_navigation';
import { useSpaceId } from '../../hooks/use_space_id';
import { useTraceExists } from '../../hooks/use_trace_exists';
import { useTracingEnabled } from '../../hooks/use_tracing_enabled';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import { DebugTraceButton } from './debug_trace_button';
import { RecentTracesList } from './recent_traces_list';
import { SpanTreeView } from './span_tree_view';
import { useRecentTraces } from './use_recent_traces';

type ViewMode = 'waterfall' | 'tree';

interface TraceViewerProps {
  traceId?: string;
}

/**
 * Standalone trace viewer page.
 *
 * - When a `traceId` is provided (via `/manage/traces/:traceId`), fetches its spans
 *   from the space-scoped Agent Builder traces data stream and renders them either
 *   as a waterfall (via `@kbn/llm-trace-waterfall`) or as a deterministic span tree.
 * - When no `traceId` is provided, shows a list of the 10 most recent traces in the
 *   space. A compact "search by trace ID" field remains available for deep-linking
 *   into a specific trace.
 */
export const TraceViewer: React.FC<TraceViewerProps> = ({ traceId }) => {
  const { services } = useKibana();
  const { data, spaces } = services.plugins;
  const { navigateToAgentBuilderUrl, createAgentBuilderUrl } = useNavigation();
  const spaceId = useSpaceId(spaces);
  const isTracingEnabled = useTracingEnabled();

  const [inputValue, setInputValue] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('waterfall');

  const tracesIndex = useMemo(
    () => (spaceId ? buildAgentBuilderTracesIndexPattern(spaceId) : undefined),
    [spaceId]
  );

  const fetchTrace = useMemo(
    () =>
      tracesIndex
        ? createEsTraceFetcher(data.search.search, { index: tracesIndex })
        : createEsTraceFetcher(data.search.search),
    [data.search.search, tracesIndex]
  );

  const { spans, durationMs, isLoading, error } = useTraceSpans(traceId ?? null, {
    fetchTrace,
    index: tracesIndex,
    enabled: Boolean(traceId) && isTracingEnabled,
  });

  // Lets the empty state distinguish a genuine "not found / wrong space" trace from the
  // rare "exists but has no spans" case, rather than showing one ambiguous message.
  const { exists: traceExists } = useTraceExists(traceId ?? null, {
    enabled: Boolean(traceId) && isTracingEnabled,
  });

  // Only fetch the recent-traces table on the landing view; we do not want an
  // extra query firing whenever the user is deep-linked into a specific trace.
  const recentTraces = useRecentTraces({
    search: data.search.search,
    index: tracesIndex,
    enabled: !traceId && isTracingEnabled,
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const value = inputValue.trim();
      if (!value) return;
      navigateToAgentBuilderUrl(appPaths.manage.traceDetails({ traceId: value }));
    },
    [inputValue, navigateToAgentBuilderUrl]
  );

  // A settled, span-less result: the trace ID resolved but returned nothing. `useTraceExists`
  // tells us whether that's a genuine "not found" (nothing in the index) vs. a rare empty trace.
  const showNotFound = Boolean(traceId) && !isLoading && !error && spans.length === 0;

  const renderTraceHeader = (id: string) => (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          iconType="chevronSingleLeft"
          flush="left"
          href={createAgentBuilderUrl(appPaths.manage.traces)}
          onClick={(event: React.MouseEvent) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            navigateToAgentBuilderUrl(appPaths.manage.traces);
          }}
          data-test-subj="agentBuilderTraceBackButton"
        >
          {labels.traces.backToTraces}
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {labels.traces.traceIdLabel}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCode transparentBackground>{id}</EuiCode>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={id}>
              {(copy) => (
                <EuiToolTip content={labels.traces.copyTraceIdAriaLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="copy"
                    color="text"
                    onClick={copy}
                    aria-label={labels.traces.copyTraceIdAriaLabel}
                    data-test-subj="agentBuilderTraceIdCopyButton"
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderDetailBody = (id: string) => (
    <EuiFlexGroup direction="column" gutterSize="m" style={{ height: '100%', minHeight: 480 }}>
      <EuiFlexItem grow={false}>{renderTraceHeader(id)}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={labels.traces.viewToggleLegend}
              idSelected={viewMode}
              onChange={(nextId) => setViewMode(nextId as ViewMode)}
              options={[
                {
                  id: 'waterfall',
                  label: labels.traces.waterfallViewLabel,
                  iconType: 'chartWaterfall',
                  'data-test-subj': 'agentBuilderTraceViewToggleWaterfall',
                },
                {
                  id: 'tree',
                  label: labels.traces.treeViewLabel,
                  iconType: 'nested',
                  'data-test-subj': 'agentBuilderTraceViewToggleTree',
                },
              ]}
              buttonSize="compressed"
              isDisabled={showNotFound}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <DebugTraceButton traceId={id} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem style={{ minHeight: 0 }}>
        <EuiPanel hasBorder paddingSize="m" style={{ height: '100%' }}>
          {showNotFound ? (
            <EuiEmptyPrompt
              iconType={traceExists ? 'help' : 'magnify'}
              title={
                <h3>
                  {traceExists ? labels.traces.emptyStateTitle : labels.traces.traceNotFoundTitle}
                </h3>
              }
              body={
                <p>
                  {traceExists
                    ? labels.traces.emptyStateMessage
                    : labels.traces.traceNotFoundMessage}
                </p>
              }
              data-test-subj="agentBuilderTraceNotFound"
            />
          ) : viewMode === 'waterfall' ? (
            <TraceWaterfall
              spans={spans}
              traceId={id}
              durationMs={durationMs}
              isLoading={isLoading}
              error={error}
              layout="horizontal"
            />
          ) : (
            <SpanTreeView spans={spans} isLoading={isLoading} error={error} />
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const renderLandingBody = () => (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{labels.traces.recentTracesTitle}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {labels.traces.recentTracesDescription}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RecentTracesList
          traces={recentTraces.traces}
          isLoading={recentTraces.isLoading}
          error={recentTraces.error}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderTracesPage" restrictWidth={false}>
      <KibanaPageTemplate.Header
        pageTitle={labels.traces.libraryTitle}
        description={labels.traces.pageDescription}
      />
      <KibanaPageTemplate.Section grow>
        {!isTracingEnabled && (
          <>
            <EuiCallOut
              color="warning"
              iconType="warning"
              announceOnMount
              title={labels.traces.tracingDisabledTitle}
              data-test-subj="agentBuilderTracingDisabledCallout"
            >
              <p>{labels.traces.tracingDisabledMessage}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        {traceId ? (
          renderDetailBody(traceId)
        ) : (
          <>
            <EuiForm component="form" onSubmit={handleSubmit}>
              <EuiFlexGroup gutterSize="s" alignItems="flexEnd">
                <EuiFlexItem>
                  <EuiFormRow label={labels.traces.searchByIdLabel} fullWidth>
                    <EuiFieldText
                      fullWidth
                      value={inputValue}
                      placeholder={labels.traces.traceIdPlaceholder}
                      onChange={(e) => setInputValue(e.target.value)}
                      data-test-subj="agentBuilderTraceIdInput"
                      compressed
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    type="submit"
                    iconType="magnify"
                    isDisabled={!inputValue.trim()}
                    data-test-subj="agentBuilderTraceIdSubmit"
                  >
                    {labels.traces.viewTraceButton}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>

            <EuiSpacer size="l" />

            {renderLandingBody()}
          </>
        )}
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
