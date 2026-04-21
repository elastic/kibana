/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldSearch,
  EuiPageSection,
  EuiSpacer,
  EuiPopover,
  EuiSplitButton,
  EuiRefreshInterval,
  EuiText,
  EuiButton,
  EuiTitle,
  EuiEmptyPrompt,
  useEuiTheme,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  type OnRefreshChangeProps,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { useParams } from 'react-router-dom';
import type { TraceSummary } from '@kbn/evals-common';
import { useProjectTraces } from '../../hooks/use_evals_api';
import { TraceWaterfall } from '../../components/trace_waterfall';
import { LastUpdatedAt } from '../../components/last_updated_at';
import { formatLatency, formatTokens } from '../../utils/format_utils';
import * as i18n from './translations';

const MIN_REFRESH_INTERVAL = 5000;

export const TracingProjectDetailPage: React.FC = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const decodedProjectName = decodeURIComponent(projectName);
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const [isPaused, setIsPaused] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [isAutoRefreshOpen, setIsAutoRefreshOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useProjectTraces(
    decodedProjectName,
    {
      page: pageIndex + 1,
      perPage: pageSize,
      name: debouncedSearch || undefined,
      sortField: 'start_time',
      sortOrder: 'desc',
    },
    {
      refetchInterval: isPaused ? false : refreshInterval,
    }
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const onRefreshChange = useCallback(
    ({ isPaused: paused, refreshInterval: interval }: OnRefreshChangeProps) => {
      setIsPaused(paused);
      setRefreshInterval(interval >= MIN_REFRESH_INTERVAL ? interval : MIN_REFRESH_INTERVAL);
    },
    []
  );

  const columns: Array<EuiBasicTableColumn<TraceSummary>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        width: '160px',
        render: (name: string, trace: TraceSummary) => (
          <EuiLink
            onClick={() => setSelectedTraceId(trace.trace_id)}
            data-test-subj="traceNameLink"
          >
            {name}
          </EuiLink>
        ),
      },
      {
        field: 'prompt_id',
        name: i18n.COLUMN_PROMPT,
        width: '180px',
        render: (promptId: string | undefined) =>
          promptId ? (
            <EuiBadge color="hollow">{promptId}</EuiBadge>
          ) : (
            <EuiText size="xs" color="subdued">
              {'-'}
            </EuiText>
          ),
      },
      {
        field: 'model',
        name: i18n.COLUMN_MODEL,
        width: '180px',
        render: (model: string | undefined) => (
          <EuiText size="xs" color="subdued">
            {model ?? '-'}
          </EuiText>
        ),
      },
      {
        field: 'input_preview',
        name: i18n.COLUMN_INPUT,
        truncateText: true,
        render: (input: string | undefined) => (
          <EuiText size="xs" color="subdued">
            {input ? input.substring(0, 80) : '-'}
          </EuiText>
        ),
      },
      {
        field: 'output_preview',
        name: i18n.COLUMN_OUTPUT,
        truncateText: true,
        render: (output: string | undefined) => (
          <EuiText size="xs" color="subdued">
            {output ? output.substring(0, 80) : '-'}
          </EuiText>
        ),
      },
      {
        field: 'start_time',
        name: i18n.COLUMN_START_TIME,
        sortable: true,
        width: '150px',
        render: (ts: string) => {
          if (!ts) return '-';
          const d = new Date(ts);
          const datePart = d.toLocaleDateString(undefined, {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
          });
          const timePart = d.toLocaleTimeString();
          return (
            <EuiText size="xs">
              <div>{datePart}</div>
              <div>{timePart}</div>
            </EuiText>
          );
        },
      },
      {
        field: 'duration_ms',
        name: i18n.COLUMN_LATENCY,
        sortable: true,
        width: '90px',
        render: (ms: number) => (
          <EuiBadge color={ms > 30000 ? 'danger' : ms > 10000 ? 'warning' : 'default'}>
            {formatLatency(ms)}
          </EuiBadge>
        ),
      },
      {
        field: 'tokens',
        name: i18n.COLUMN_TOKENS,
        width: '90px',
        render: (tokens: TraceSummary['tokens']) =>
          tokens?.total != null ? formatTokens(tokens.total) : '-',
      },
      {
        field: 'total_spans',
        name: i18n.COLUMN_SPANS,
        width: '70px',
        render: (count: number | undefined) => count ?? '-',
      },
    ],
    [setSelectedTraceId]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<TraceSummary>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <>
      <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>{decodedProjectName}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <LastUpdatedAt updatedAt={dataUpdatedAt} isUpdating={isFetching} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiPopover
                  aria-label={i18n.AUTO_REFRESH_ARIA_LABEL}
                  button={
                    <EuiSplitButton isLoading={isFetching} data-test-subj="projectTracesRefresh">
                      <EuiSplitButton.ActionPrimary
                        iconType="refresh"
                        onClick={onRefresh}
                        data-test-subj="projectTracesRefreshButton"
                      >
                        {i18n.REFRESH_BUTTON_LABEL}
                      </EuiSplitButton.ActionPrimary>
                      <EuiSplitButton.ActionSecondary
                        iconType="backgroundTask"
                        aria-label={i18n.AUTO_REFRESH_ARIA_LABEL}
                        onClick={() => setIsAutoRefreshOpen((open) => !open)}
                        data-test-subj="projectTracesAutoRefreshButton"
                      />
                    </EuiSplitButton>
                  }
                  isOpen={isAutoRefreshOpen}
                  closePopover={() => setIsAutoRefreshOpen(false)}
                  panelPaddingSize="s"
                  anchorPosition="downRight"
                >
                  <EuiRefreshInterval
                    isPaused={isPaused}
                    refreshInterval={refreshInterval}
                    minInterval={MIN_REFRESH_INTERVAL}
                    onRefreshChange={onRefreshChange}
                  />
                </EuiPopover>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFieldSearch
              placeholder={i18n.SEARCH_PLACEHOLDER}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPageIndex(0);
              }}
              isClearable
              data-test-subj="projectTracesSearch"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        {error ? (
          <EuiEmptyPrompt
            color="danger"
            iconType="warning"
            title={<h2>{i18n.LOAD_ERROR_TITLE}</h2>}
            body={
              <p>{i18n.getLoadErrorBody(error instanceof Error ? error.message : String(error))}</p>
            }
            actions={[
              <EuiButton onClick={() => refetch()} iconType="refresh">
                {i18n.RETRY_BUTTON}
              </EuiButton>,
            ]}
          />
        ) : !isLoading && (data?.traces ?? []).length === 0 ? (
          <EuiEmptyPrompt
            iconType="editorStrike"
            title={<h3>{i18n.NO_TRACES_TITLE}</h3>}
            body={<p>{i18n.NO_TRACES_BODY}</p>}
          />
        ) : (
          <EuiBasicTable<TraceSummary>
            items={data?.traces ?? []}
            columns={columns}
            tableCaption={i18n.TABLE_CAPTION}
            loading={isLoading}
            pagination={pagination}
            onChange={onTableChange}
            rowProps={(item) => ({
              onClick: () => setSelectedTraceId(item.trace_id),
              style: { cursor: 'pointer' },
              'data-test-subj': `traceRow-${item.trace_id}`,
            })}
            data-test-subj="projectTracesTable"
          />
        )}
      </EuiPageSection>

      {selectedTraceId && (
        <EuiFlyoutResizable
          ownFocus
          onClose={() => setSelectedTraceId(null)}
          size="l"
          minWidth={480}
          maxWidth={1600}
          aria-labelledby="traceWaterfallTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2 id="traceWaterfallTitle" style={{ wordBreak: 'break-all' }}>
                {i18n.getTraceFlyoutTitle(selectedTraceId)}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody
            className={css`
              .euiFlyoutBody__overflowContent {
                height: 100%;
                padding: 0;
              }
              .euiFlyoutBody__overflow {
                overflow: hidden;
              }
            `}
          >
            <div style={{ height: '100%', padding: 16 }}>
              <TraceWaterfall traceId={selectedTraceId} layout="horizontal" />
            </div>
          </EuiFlyoutBody>
        </EuiFlyoutResizable>
      )}
    </>
  );
};
