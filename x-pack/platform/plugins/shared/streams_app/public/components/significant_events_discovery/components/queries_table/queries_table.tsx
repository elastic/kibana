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
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQueryClient } from '@kbn/react-query';
import React, { useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { orderBy } from 'lodash';
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
import { useFetchStreams } from '../../hooks/use_fetch_streams';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { buildDiscoverParams } from '../../utils/discover_helpers';
import {
  ACTIONS_COLUMN_TITLE,
  BACKED_STATUS_COLUMN,
  CHART_SERIES_NAME,
  CHART_TITLE,
  IMPACT_COLUMN,
  LAST_OCCURRED_COLUMN,
  NO_ITEMS_MESSAGE,
  NOT_PROMOTED_BADGE_LABEL,
  NOT_PROMOTED_TOOLTIP_CONTENT,
  OCCURRENCES_COLUMN,
  OCCURRENCES_TOOLTIP_NAME,
  OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
  OPEN_IN_DISCOVER_ACTION_TITLE,
  PROMOTED_BADGE_LABEL,
  PROMOTED_TOOLTIP_CONTENT,
  PROMOTE_ALL_BUTTON,
  PROMOTE_ALL_CALLOUT_DESCRIPTION,
  PROMOTE_ALL_ERROR_TOAST_TITLE,
  PROMOTE_QUERY_ACTION_DESCRIPTION,
  PROMOTE_QUERY_ACTION_TITLE,
  SEARCH_PLACEHOLDER,
  STREAM_COLUMN,
  TABLE_CAPTION,
  TITLE_COLUMN,
  UNABLE_TO_LOAD_QUERIES_BODY,
  UNABLE_TO_LOAD_QUERIES_TITLE,
  getEventsCount,
  getPromoteAllCalloutTitle,
  getPromoteAllSuccessToast,
} from './translations';
import { PromoteAction } from './promote_action';

export function QueriesTable() {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: { unifiedSearch, share },
    },
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const { timeState } = useTimefilter();
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: queriesData,
    isLoading: queriesLoading,
    isError: hasQueriesError,
  } = useFetchSignificantEvents({ query: searchQuery });
  const {
    data: streamsData,
    isLoading: streamsLoading,
    isError: hasStreamsError,
  } = useFetchStreams();
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

  if (queriesLoading || streamsLoading) {
    return <LoadingPanel size="l" />;
  }

  if (hasQueriesError || hasStreamsError) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{UNABLE_TO_LOAD_QUERIES_TITLE}</h2>}
        body={<p>{UNABLE_TO_LOAD_QUERIES_BODY}</p>}
      />
    );
  }

  const sortedQueries = orderBy(
    queriesData?.significant_events ?? [],
    ['rule_backed', (event) => event.query.severity_score, (event) => event.query.title],
    ['desc', 'desc', 'asc']
  );
  const streamDefinitions = streamsData?.streams ?? [];
  const discoverLocator = share.url.locators.get<DiscoverAppLocatorParams>(DISCOVER_APP_LOCATOR);

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'query.title',
      name: TITLE_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiLink onClick={() => {}}>{item.query.title}</EuiLink>
      ),
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
      align: 'center',
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
    {
      field: 'stream_name',
      name: STREAM_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiBadge color="hollow">{item.stream_name}</EuiBadge>
      ),
    },
    {
      field: 'rule_backed',
      name: BACKED_STATUS_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => {
        return (
          <EuiToolTip
            content={item.rule_backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
          >
            <span tabIndex={0}>
              {item.rule_backed && <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>}
              {!item.rule_backed && <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>}
            </span>
          </EuiToolTip>
        );
      },
    },
    {
      name: ACTIONS_COLUMN_TITLE,
      actions: [
        {
          name: OPEN_IN_DISCOVER_ACTION_TITLE,
          type: 'icon',
          icon: 'discoverApp',
          description: OPEN_IN_DISCOVER_ACTION_DESCRIPTION,
          enabled: () => discoverLocator !== undefined,
          onClick: (item) => {
            const definition = streamDefinitions.find(
              (streamItem) => streamItem.stream.name === item.stream_name
            );

            if (!definition) {
              return;
            }

            discoverLocator?.navigate(
              buildDiscoverParams(item.query, definition.stream, timeState)
            );
          },
          isPrimary: true,
          'data-test-subj': 'significant_events_table_open_in_discover_action',
        },
        {
          type: 'button',
          color: 'primary',
          name: PROMOTE_QUERY_ACTION_TITLE,
          description: PROMOTE_QUERY_ACTION_DESCRIPTION,
          render: (item: SignificantEventItem) => {
            return <PromoteAction item={item} />;
          },
        },
      ],
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
                timeseries={queriesData?.aggregated_occurrences ?? []}
                annotations={[]}
                height={180}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{getEventsCount(queriesData?.significant_events.length ?? 0)}</EuiText>
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
          items={sortedQueries}
          loading={queriesLoading || streamsLoading}
          noItemsMessage={!queriesLoading && !streamsLoading ? NO_ITEMS_MESSAGE : ''}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
