/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
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
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  useFetchSignificantEvents,
  type SignificantEventItem,
} from '../../../hooks/use_fetch_significant_events';
import { SeverityBadge } from './severity_badge';
import { LoadingPanel } from '../../loading_panel';
import { SparkPlot } from '../../spark_plot';
import { useKibana } from '../../../hooks/use_kibana';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';

export function QueriesTable() {
  const { euiTheme } = useEuiTheme();
  const { unifiedSearch } = useKibana().dependencies.start;
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading: loading } = useFetchSignificantEvents({ query: searchQuery });
  const [selectedItems, setSelectedItems] = useState<SignificantEventItem[]>([]);

  if (loading && !data) {
    return <LoadingPanel size="l" />;
  }

  const columns: Array<EuiBasicTableColumn<SignificantEventItem>> = [
    {
      field: 'details',
      name: '',
      width: '40px',
      render: () => (
        <EuiButtonIcon
          data-test-subj="queriesDetailsButton"
          iconType="expand"
          aria-label={i18n.translate(
            'xpack.streams.significantEventsDiscovery.queriesTable.detailsButtonAriaLabel',
            { defaultMessage: 'View details' }
          )}
          onClick={() => {}}
        />
      ),
    },
    {
      field: 'query.title',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiLink onClick={() => {}}>{item.query.title}</EuiLink>
      ),
    },
    {
      field: 'stream_name',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.streamColumn', {
        defaultMessage: 'Stream',
      }),
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiBadge color="hollow">{item.stream_name || '--'}</EuiBadge>
      ),
    },
    {
      field: 'query.feature',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.featuresColumn', {
        defaultMessage: 'Features',
      }),
      render: (_: unknown, item: SignificantEventItem) => {
        const featureName = item.query.feature?.name;
        return featureName ? <EuiBadge color="hollow">{featureName}</EuiBadge> : '--';
      },
    },
    {
      field: 'query.severity_score',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.impactColumn', {
        defaultMessage: 'Impact',
      }),
      render: (_: unknown, item: SignificantEventItem) => {
        return <SeverityBadge score={item.query.severity_score} />;
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.queriesTable.lastOccurredColumn',
        {
          defaultMessage: 'Last occurred',
        }
      ),
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
      name: i18n.translate(
        'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesColumn',
        {
          defaultMessage: 'Occurrences',
        }
      ),
      render: (_: unknown, item: SignificantEventItem) => {
        return (
          <SparkPlot
            id={`sparkplot-${item.query.id}`}
            name={i18n.translate(
              'xpack.streams.significantEventsDiscovery.queriesTable.occurrencesTooltipName',
              { defaultMessage: 'Occurrences' }
            )}
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
              isLoading={loading}
              placeholder={i18n.translate(
                'xpack.streams.significantEventsDiscovery.queriesTable.searchPlaceholder',
                { defaultMessage: 'Search' }
              )}
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
                <h3>
                  {i18n.translate(
                    'xpack.streams.significantEventsDiscovery.queriesTable.chart.title',
                    {
                      defaultMessage: 'Detected event occurrences',
                    }
                  )}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <SparkPlot
                id="aggregated-occurrences"
                name={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.queriesTable.chart.seriesName',
                  {
                    defaultMessage: 'Occurrences',
                  }
                )}
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
        <EuiText size="s">
          {i18n.translate('xpack.streams.significantEventsDiscovery.queriesTable.eventsCount', {
            defaultMessage: '{count} Queries',
            values: { count: data?.significant_events.length ?? 0 },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={i18n.translate(
            'xpack.streams.significantEventsDiscovery.queriesTable.tableCaption',
            { defaultMessage: 'Queries table' }
          )}
          columns={columns}
          itemId="query.id"
          items={data?.significant_events ?? []}
          loading={loading}
          noItemsMessage={
            !loading
              ? i18n.translate(
                  'xpack.streams.significantEventsDiscovery.queriesTable.noItemsMessage',
                  {
                    defaultMessage: 'No queries found',
                  }
                )
              : ''
          }
          selection={{
            onSelectionChange: setSelectedItems,
            selected: selectedItems,
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
