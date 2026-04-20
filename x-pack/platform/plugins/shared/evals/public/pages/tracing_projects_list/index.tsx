/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
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
  EuiEmptyPrompt,
  useEuiTheme,
  type EuiBasicTableColumn,
  type CriteriaWithPagination,
  type OnRefreshChangeProps,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import type { TracingProject } from '@kbn/evals-common';
import { useTracingProjects } from '../../hooks/use_evals_api';
import { LastUpdatedAt } from '../../components/last_updated_at';
import * as i18n from './translations';

const MIN_REFRESH_INTERVAL = 5000;

export const TracingProjectsListPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchText, setSearchText] = useState('');

  const [isPaused, setIsPaused] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10000);
  const [isAutoRefreshOpen, setIsAutoRefreshOpen] = useState(false);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useTracingProjects(
    {
      page: pageIndex + 1,
      perPage: pageSize,
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

  const filteredProjects = useMemo(() => {
    const projects = data?.projects ?? [];
    if (!searchText) return projects;
    const lower = searchText.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(lower));
  }, [data?.projects, searchText]);

  const columns: Array<EuiBasicTableColumn<TracingProject>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: true,
        render: (name: string) => (
          <EuiLink
            onClick={() => history.push(`/tracing/${encodeURIComponent(name)}`)}
            data-test-subj="tracingProjectNameLink"
          >
            <strong>{name}</strong>
          </EuiLink>
        ),
      },
      {
        field: 'last_trace_time',
        name: i18n.COLUMN_LAST_TRACE,
        sortable: true,
        render: (ts: string) => (ts ? new Date(ts).toLocaleString() : '-'),
      },
      {
        field: 'trace_count',
        name: i18n.COLUMN_TRACE_COUNT,
        sortable: true,
        width: '120px',
        render: (count: number) => <EuiBadge color="hollow">{count}</EuiBadge>,
      },
      {
        field: 'error_rate',
        name: i18n.COLUMN_ERROR_RATE,
        sortable: true,
        width: '110px',
        render: (rate: number | undefined) => {
          if (rate == null) return '-';
          const pct = i18n.formatErrorRate(rate);
          const color = rate > 0.1 ? 'danger' : rate > 0 ? 'warning' : 'default';
          return <EuiBadge color={color}>{pct}</EuiBadge>;
        },
      },
      {
        field: 'p50_latency_ms',
        name: i18n.COLUMN_P50_LATENCY,
        sortable: true,
        width: '120px',
        render: (ms: number | undefined) => (ms != null ? i18n.formatLatency(ms) : '-'),
      },
      {
        field: 'p99_latency_ms',
        name: i18n.COLUMN_P99_LATENCY,
        sortable: true,
        width: '120px',
        render: (ms: number | undefined) => (ms != null ? i18n.formatLatency(ms) : '-'),
      },
      {
        field: 'total_tokens',
        name: i18n.COLUMN_TOTAL_TOKENS,
        sortable: true,
        width: '120px',
        render: (tokens: number | undefined) => (tokens != null ? i18n.formatTokens(tokens) : '-'),
      },
    ],
    [history]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: searchText ? filteredProjects.length : data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const onTableChange = ({ page }: CriteriaWithPagination<TracingProject>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  };

  return (
    <EuiPageSection paddingSize="none" css={{ paddingTop: euiTheme.size.l }}>
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem>
          <EuiFieldSearch
            placeholder={i18n.SEARCH_PLACEHOLDER}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPageIndex(0);
            }}
            isClearable
            data-test-subj="tracingProjectsSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LastUpdatedAt updatedAt={dataUpdatedAt} isUpdating={isFetching} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiSplitButton isLoading={isFetching} data-test-subj="tracingProjectsRefresh">
                <EuiSplitButton.ActionPrimary
                  iconType="refresh"
                  onClick={onRefresh}
                  data-test-subj="tracingProjectsRefreshButton"
                >
                  {i18n.REFRESH_BUTTON_LABEL}
                </EuiSplitButton.ActionPrimary>
                <EuiSplitButton.ActionSecondary
                  iconType="backgroundTask"
                  aria-label={i18n.AUTO_REFRESH_ARIA_LABEL}
                  onClick={() => setIsAutoRefreshOpen((open) => !open)}
                  data-test-subj="tracingProjectsAutoRefreshButton"
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
      <EuiSpacer size="m" />
      {error ? (
        <>
          <EuiText color="danger" size="s">
            <p>{String(error)}</p>
          </EuiText>
          <EuiSpacer size="m" />
        </>
      ) : null}
      {!isLoading && filteredProjects.length === 0 ? (
        <EuiEmptyPrompt
          iconType="editorStrike"
          title={<h3>{i18n.NO_PROJECTS_TITLE}</h3>}
          body={<p>{i18n.NO_PROJECTS_BODY}</p>}
        />
      ) : (
        <EuiBasicTable<TracingProject>
          items={filteredProjects}
          columns={columns}
          tableCaption={i18n.TABLE_CAPTION}
          loading={isLoading}
          pagination={pagination}
          onChange={onTableChange}
          rowProps={(item) => ({
            onClick: () => history.push(`/tracing/${encodeURIComponent(item.name)}`),
            style: { cursor: 'pointer' },
            'data-test-subj': `tracingProjectRow-${item.name}`,
          })}
          data-test-subj="tracingProjectsTable"
        />
      )}
    </EuiPageSection>
  );
};
