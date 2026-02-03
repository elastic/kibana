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
import { useQueryClient, useMutation } from '@kbn/react-query';
import React, { useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
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
  const { data: queriesData, isLoading: queriesLoading } = useFetchSignificantEvents({
    query: searchQuery,
  });
  const { data: streamsData, isLoading: streamsLoading } = useFetchStreams();
  const { count: unbackedCount } = useUnbackedQueriesCount();
  const queryClient = useQueryClient();
  const { promoteAll, promote } = useQueriesApi();

  const promoteMutation = useMutation({
    mutationFn: promote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['significantEvents'] });
      queryClient.invalidateQueries({ queryKey: ['unbackedQueriesCount'] });
    },
  });

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

  if (!queriesData || !streamsData) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        color="danger"
        title={<h2>{UNABLE_TO_LOAD_QUERIES_TITLE}</h2>}
        body={<p>{UNABLE_TO_LOAD_QUERIES_BODY}</p>}
      />
    );
  }

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
      field: 'rule_baked',
      name: BACKED_STATUS_COLUMN,
      render: (_: unknown, item: SignificantEventItem) => {
        return (
          <EuiToolTip
            content={item.rule_backed ? PROMOTED_TOOLTIP_CONTENT : NOT_PROMOTED_TOOLTIP_CONTENT}
          >
            <>
              {item.rule_backed && <EuiBadge color="hollow">{PROMOTED_BADGE_LABEL}</EuiBadge>}
              {!item.rule_backed && <EuiBadge color="warning">{NOT_PROMOTED_BADGE_LABEL}</EuiBadge>}
            </>
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
            const definition = streamsData.streams.find(
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
          icon: 'launch',
          type: 'icon',
          color: 'primary',
          name: PROMOTE_QUERY_ACTION_TITLE,
          description: PROMOTE_QUERY_ACTION_DESCRIPTION,
          onClick: (item) => {
            promoteMutation.mutate({
              queryId: item.query.id,
              streamName: item.stream_name,
            });
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
                timeseries={queriesData.aggregated_occurrences ?? []}
                annotations={[]}
                height={180}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{getEventsCount(queriesData.significant_events.length ?? 0)}</EuiText>
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
          items={queriesData.significant_events ?? []}
          loading={queriesLoading}
          noItemsMessage={!queriesLoading ? NO_ITEMS_MESSAGE : ''}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const getPromoteAllSuccessToast = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.promoteAllSuccess', {
    defaultMessage: 'Promoted {count} {count, plural, one {query} other {queries}}',
    values: { count },
  });

const PROMOTE_ALL_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllErrorTitle',
  { defaultMessage: 'Failed to promote queries' }
);

const TITLE_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.titleColumn',
  {
    defaultMessage: 'Title',
  }
);

const STREAM_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.streamColumn',
  {
    defaultMessage: 'Stream',
  }
);

const BACKED_STATUS_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.backedStatusColumn',
  {
    defaultMessage: 'Status',
  }
);

const IMPACT_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.impactColumn',
  {
    defaultMessage: 'Impact',
  }
);

const LAST_OCCURRED_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.lastOccurredColumn',
  {
    defaultMessage: 'Last occurred',
  }
);

const OCCURRENCES_COLUMN = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesColumn',
  {
    defaultMessage: 'Occurrences',
  }
);

const OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesTooltipName',
  { defaultMessage: 'Occurrences' }
);

const PROMOTED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promotedBadgeLabel',
  {
    defaultMessage: 'promoted',
  }
);

const NOT_PROMOTED_BADGE_LABEL = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.notPromotedBadgeLabel',
  {
    defaultMessage: 'not promoted',
  }
);

const PROMOTED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promotedTooltipContent',
  {
    defaultMessage: 'Query has a backing rule that looks for significant events',
  }
);

const NOT_PROMOTED_TOOLTIP_CONTENT = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.notPromotedTooltipContent',
  {
    defaultMessage: "Query doesn't have a backing rule and it doesn't generate significant events",
  }
);

const getPromoteAllCalloutTitle = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.promoteAllCalloutTitle', {
    defaultMessage:
      '{count} {count, plural, one {query is} other {queries are}} ready for promotion',
    values: { count },
  });

const PROMOTE_ALL_CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllCalloutDescription',
  {
    defaultMessage:
      'Enable scheduled runs for these queries so their results are saved as Significant events, powering Insight generation.',
  }
);

const PROMOTE_ALL_BUTTON = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteAllButton',
  { defaultMessage: 'Promote all' }
);

const SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.searchPlaceholder',
  { defaultMessage: 'Search' }
);

const CHART_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.chart.title',
  {
    defaultMessage: 'Detected event occurrences',
  }
);

const CHART_SERIES_NAME = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.chart.seriesName',
  {
    defaultMessage: 'Occurrences',
  }
);

const getEventsCount = (count: number) =>
  i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.eventsCount', {
    defaultMessage: '{count} Queries',
    values: { count },
  });

const TABLE_CAPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.tableCaption',
  { defaultMessage: 'Queries table' }
);

const NO_ITEMS_MESSAGE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.noItemsMessage',
  {
    defaultMessage: 'No queries found',
  }
);

const UNABLE_TO_LOAD_QUERIES_TITLE = i18n.translate(
  'xpack.streams.queriesTable.loadingError.title',
  { defaultMessage: 'Unable to load queries' }
);

const UNABLE_TO_LOAD_QUERIES_BODY = i18n.translate('xpack.streams.queriesTable.loadingError.body', {
  defaultMessage: "Try refreshing the page or contact support if error doesn't go away",
});

const ACTIONS_COLUMN_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.actionsColumnTitle',
  { defaultMessage: 'Actions' }
);

const OPEN_IN_DISCOVER_ACTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.openInDiscoverActionTitle',
  { defaultMessage: 'Open in Discover' }
);

const OPEN_IN_DISCOVER_ACTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.openInDiscoverActionDescription',
  { defaultMessage: 'Open query in Discover' }
);

const PROMOTE_QUERY_ACTION_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteQueryActionTitle',
  { defaultMessage: 'Promote' }
);

const PROMOTE_QUERY_ACTION_DESCRIPTION = i18n.translate(
  'xpack.streams.significantEventsDiscovery.queriesTable.promoteQueryActionDescription',
  {
    defaultMessage: 'Create a backing rule for this query and start looking for significant events',
  }
);
