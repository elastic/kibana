/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import React, { useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import {
  useFetchSignificantEvents,
  type SignificantEventItem,
} from '../../../../hooks/use_fetch_significant_events';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/use_queries_api';
import {
  UNBACKED_QUERIES_COUNT_QUERY_KEY,
  useUnbackedQueriesCount,
} from '../../../../hooks/use_unbacked_queries_count';
import { LoadingPanel } from '../../../loading_panel';
import { SparkPlot } from '../../../spark_plot';
import { StreamsAppSearchBar } from '../../../streams_app_search_bar';
import { SeverityBadge } from '../severity_badge/severity_badge';
import {
  CHART_SERIES_NAME,
  CHART_TITLE,
  IMPACT_COLUMN,
  LAST_OCCURRED_COLUMN,
  NO_ITEMS_MESSAGE,
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  PROMOTE_ALL_BUTTON,
  PROMOTE_ALL_CALLOUT_DESCRIPTION,
  PROMOTE_ALL_ERROR_TOAST_TITLE,
  SEARCH_PLACEHOLDER,
  STREAM_COLUMN,
  SYSTEMS_COLUMN,
  TABLE_CAPTION,
  TITLE_COLUMN,
  getEventsCount,
  getPromoteAllCalloutTitle,
  getPromoteAllSuccessToast,
} from './translations';

export function QueriesTable() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: { unifiedSearch },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading: queriesLoading } = useFetchSignificantEvents({ query: searchQuery });
  const { count: unbackedCount } = useUnbackedQueriesCount();
  const queryClient = useQueryClient();
  const { promoteAll } = useQueriesApi();

  const [{ loading: isPromoting }, onPromoteAll] = useAsyncFn(async () => {
    try {
      const { promoted } = await promoteAll();
      toasts.addSuccess(getPromoteAllSuccessToast(promoted));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['significantEvents'] }),
        queryClient.invalidateQueries({ queryKey: UNBACKED_QUERIES_COUNT_QUERY_KEY }),
      ]);
    } catch (error) {
      toasts.addError(error, {
        title: PROMOTE_ALL_ERROR_TOAST_TITLE,
      });
    }
  }, [promoteAll, queryClient, toasts]);

  if (queriesLoading && !data) {
    return <LoadingPanel size="l" />;
  }

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'query.title',
      name: TITLE_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiLink onClick={() => {}}>{item.query.title}</EuiLink>
      ),
    },
    {
      field: 'stream_name',
      name: STREAM_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiBadge color="hollow">{item.stream_name || '--'}</EuiBadge>
      ),
    },
    {
      field: 'query.feature',
      name: SYSTEMS_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => {
        const systemName = item.query.feature?.name;
        return systemName ? <EuiBadge color="hollow">{systemName}</EuiBadge> : '--';
      },
    },
    {
      field: 'query.severity_score',
      name: IMPACT_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => {
        return <SeverityBadge score={item.query.severity_score} />;
      },
    },
    {
      field: 'occurrences',
      name: LAST_OCCURRED_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => {
        const lastOccurrence = item.occurrences.findLast((occurrence) => occurrence.y !== 0);
        if (!lastOccurrence) {
          return '--';
        }
        const date = new Date(lastOccurrence.x);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        return <EuiText size="s">{`${formattedDate} @ ${formattedTime}`}</EuiText>;
      },
    },
    {
      field: 'occurrences',
      name: OCCURRENCES_COLUMN,
      width: '160px',
      render: (_: unknown, item: SignificantEventItem) => {
        return (
          <SparkPlot
            id={`sparkplot-${item.query.id}`}
            name={OCCURRENCES_TOOLTIP_NAME}
            type="bar"
            timeseries={item.occurrences}
            annotations={[]}
            compressed
            hideAxis
            height={32}
          />
        );
      },
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {unbackedCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiCallOut
            announceOnMount
            title={getPromoteAllCalloutTitle(unbackedCount)}
            iconType="info"
            data-test-subj="queriesPromoteAllCallout"
          >
            <p>{PROMOTE_ALL_CALLOUT_DESCRIPTION}</p>
            <EuiButton
              fill
              onClick={onPromoteAll}
              isLoading={isPromoting}
              data-test-subj="queriesPromoteAllButton"
            >
              {PROMOTE_ALL_BUTTON}
            </EuiButton>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <unifiedSearch.ui.SearchBar
              appName="streamsApp"
              showFilterBar={false}
              showQueryMenu={false}
              showQueryInput
              showDatePicker={false}
              submitButtonStyle="iconOnly"
              displayStyle="inPage"
              disableQueryLanguageSwitcher
              onQuerySubmit={(queryPayload) => {
                setSearchQuery(String(queryPayload.query?.query ?? ''));
              }}
              query={{
                query: searchQuery,
                language: 'text',
              }}
              isLoading={queriesLoading}
              placeholder={SEARCH_PLACEHOLDER}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StreamsAppSearchBar showDatePicker />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder hasShadow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{CHART_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <SparkPlot
                id="aggregated-occurrences"
                name={CHART_SERIES_NAME}
                type="bar"
                timeseries={data?.aggregated_occurrences ?? []}
                annotations={[]}
                height={180}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{getEventsCount(data?.significant_events.length ?? 0)}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={TABLE_CAPTION}
          columns={columns}
          itemId={(item) => item.query.id}
          items={data?.significant_events ?? []}
          loading={queriesLoading}
          noItemsMessage={!queriesLoading ? NO_ITEMS_MESSAGE : ''}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
