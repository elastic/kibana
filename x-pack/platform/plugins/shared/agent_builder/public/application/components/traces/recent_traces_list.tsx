/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';
import type { RecentTrace } from './use_recent_traces';

interface RecentTracesListProps {
  traces: RecentTrace[];
  isLoading: boolean;
  error: Error | null;
}

const formatDuration = (ms: number): string => {
  if (ms <= 0) return '-';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(0)}ms`;
};

/**
 * Renders the "recent traces" table on the trace viewer landing page. Each row
 * navigates to `/manage/traces/:traceId`; the trace ID column uses `EuiButtonEmpty`
 * so keyboard users get a proper focusable link target.
 *
 * Empty / error / loading states are shown inline so the table always occupies
 * the same slot on the page.
 */
export const RecentTracesList: React.FC<RecentTracesListProps> = ({ traces, isLoading, error }) => {
  const { createAgentBuilderUrl, navigateToAgentBuilderUrl } = useNavigation();

  if (error) {
    return (
      <EuiCallOut
        color="danger"
        iconType="error"
        title={labels.traces.recentTracesLoadErrorTitle}
        announceOnMount
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  if (!isLoading && !traces.length) {
    return (
      <EuiEmptyPrompt
        iconType="clock"
        title={<h3>{labels.traces.recentTracesEmptyTitle}</h3>}
        body={<p>{labels.traces.recentTracesEmptyMessage}</p>}
        data-test-subj="agentBuilderRecentTracesEmpty"
      />
    );
  }

  const columns: Array<EuiBasicTableColumn<RecentTrace>> = [
    {
      field: 'timestamp',
      name: labels.traces.recentTracesColumnStartedAt,
      width: '180px',
      render: (value: string) =>
        value ? (
          <EuiText size="s">
            <FormattedRelative value={value} />
          </EuiText>
        ) : (
          <EuiText size="s" color="subdued">
            —
          </EuiText>
        ),
    },
    {
      field: 'rootSpanName',
      name: labels.traces.recentTracesColumnRootSpan,
      render: (name: string) => <EuiText size="s">{name}</EuiText>,
    },
    {
      field: 'traceId',
      name: labels.traces.recentTracesColumnTraceId,
      width: '360px',
      render: (traceId: string) => (
        <EuiButtonEmpty
          size="s"
          flush="left"
          href={createAgentBuilderUrl(appPaths.manage.traceDetails({ traceId }))}
          onClick={(event: React.MouseEvent) => {
            // Support cmd/ctrl+click for "open in new tab" — fall through to the href.
            if (event.metaKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            navigateToAgentBuilderUrl(appPaths.manage.traceDetails({ traceId }));
          }}
          data-test-subj="agentBuilderRecentTraceLink"
        >
          <EuiCode transparentBackground>{traceId}</EuiCode>
        </EuiButtonEmpty>
      ),
    },
    {
      name: labels.traces.recentTracesColumnActions,
      width: '80px',
      align: 'right',
      render: (item: RecentTrace) => (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          responsive={false}
          justifyContent="flexEnd"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {formatDuration(item.durationMs)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
  ];

  return (
    <EuiBasicTable
      columns={columns}
      items={traces}
      loading={isLoading}
      tableCaption={labels.traces.recentTracesTitle}
      rowProps={(item) => ({ 'data-test-subj': `agentBuilderRecentTracesRow-${item.traceId}` })}
      data-test-subj="agentBuilderRecentTracesTable"
    />
  );
};
