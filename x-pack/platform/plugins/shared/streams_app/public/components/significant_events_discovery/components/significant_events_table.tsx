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
  EuiCallOut,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingElastic,
  EuiLoadingChart,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import type { SignificantEventItem } from '../../../hooks/use_fetch_significant_events';
import { useFetchSignificantEvents } from '../../../hooks/use_fetch_significant_events';
import { SeverityBadge } from './severity_badge';
import { LoadingPanel } from '../../loading_panel';
import { SparkPlot } from '../../spark_plot';
import { StreamsAppSearchBar } from '../../streams_app_search_bar';

export function SignificantEventsTable() {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<SignificantEventItem[]>([]);

  // TODO: Replace with actual loading state from the task that detects significant events
  // For now, this is manually set to simulate loading
  const [isLoading] = useState(false);

  // TODO: Replace with new endpoint that fetches significant events from all streams
  const streamName = 'logs';

  const { data, isLoading: loading } = useFetchSignificantEvents({
    name: streamName,
    query: '',
  });

  const items: SignificantEventItem[] = useMemo(() => {
    const significantEvents = data?.significant_events ?? [];

    if (!searchQuery.trim()) {
      return significantEvents;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return significantEvents.filter((item) => {
      const titleMatch = item.query.title?.toLowerCase().includes(lowerQuery);
      const streamMatch = streamName.toLowerCase().includes(lowerQuery);
      const featureMatch = item.query.feature?.name?.toLowerCase().includes(lowerQuery);
      return titleMatch || streamMatch || featureMatch;
    });
  }, [data?.significant_events, searchQuery]);

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
          data-test-subj="significantEventDetailsButton"
          iconType="expand"
          aria-label={i18n.translate(
            'xpack.streams.significantEventsDiscovery.table.detailsButtonAriaLabel',
            { defaultMessage: 'View details' }
          )}
          onClick={() => {}}
        />
      ),
    },
    {
      field: 'query.title',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.titleColumn', {
        defaultMessage: 'Title',
      }),
      render: (_: unknown, item: SignificantEventItem) => (
        <EuiLink onClick={() => {}}>{item.query.title}</EuiLink>
      ),
    },
    {
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.streamColumn', {
        defaultMessage: 'Stream',
      }),
      render: () => <EuiBadge color="hollow">{streamName}</EuiBadge>,
    },
    {
      field: 'query.feature',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.featuresColumn', {
        defaultMessage: 'Features',
      }),
      render: (_: unknown, item: SignificantEventItem) => {
        const featureName = item.query.feature?.name;
        return featureName ? <EuiBadge color="hollow">{featureName}</EuiBadge> : '--';
      },
    },
    {
      field: 'query.severity_score',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.impactColumn', {
        defaultMessage: 'Impact',
      }),
      render: (_: unknown, item: SignificantEventItem) => {
        return <SeverityBadge score={item.query.severity_score} />;
      },
    },
    {
      field: 'occurrences',
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.lastOccurredColumn', {
        defaultMessage: 'Last occurred',
      }),
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
      name: i18n.translate('xpack.streams.significantEventsDiscovery.table.occurrencesColumn', {
        defaultMessage: 'Occurrences',
      }),
      render: (_: unknown, item: SignificantEventItem) => {
        return (
          <SparkPlot
            id={`sparkplot-${item.query.id}`}
            name={i18n.translate(
              'xpack.streams.significantEventsDiscovery.table.occurrencesTooltipName',
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
      {isLoading && (
        <EuiFlexItem grow={false}>
          <EuiCallOut announceOnMount color="primary">
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiLoadingElastic size="l" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="subdued">
                  {i18n.translate('xpack.streams.significantEventsDiscovery.loadingBanner.title', {
                    defaultMessage:
                      'We are generating your results, once we detect an event, or an insight, we will start populating the views...',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {!isLoading && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiFieldSearch
                placeholder={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.table.searchPlaceholder',
                  { defaultMessage: 'Search' }
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                isClearable
                aria-label={i18n.translate(
                  'xpack.streams.significantEventsDiscovery.table.searchAriaLabel',
                  { defaultMessage: 'Search significant events' }
                )}
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <StreamsAppSearchBar showDatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder hasShadow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>
                  {i18n.translate('xpack.streams.significantEventsDiscovery.chart.title', {
                    defaultMessage: 'Detected event occurrences',
                  })}
                </h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              {isLoading ? (
                <EuiFlexGroup
                  justifyContent="center"
                  alignItems="center"
                  css={css`
                    height: 180px;
                  `}
                >
                  <EuiLoadingChart size="l" />
                </EuiFlexGroup>
              ) : (
                <SparkPlot
                  id="aggregated-occurrences"
                  name={i18n.translate(
                    'xpack.streams.significantEventsDiscovery.chart.seriesName',
                    {
                      defaultMessage: 'Occurrences',
                    }
                  )}
                  type="bar"
                  timeseries={data?.aggregated_occurrences ?? []}
                  annotations={[]}
                  height={180}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      {!isLoading && (
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {i18n.translate('xpack.streams.significantEventsDiscovery.table.eventsCount', {
              defaultMessage: '{count} Significant events',
              values: { count: items.length },
            })}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          css={css`
            & thead tr {
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            }
          `}
          tableCaption={i18n.translate(
            'xpack.streams.significantEventsDiscovery.table.tableCaption',
            { defaultMessage: 'Significant events table' }
          )}
          columns={columns}
          itemId="query.id"
          items={isLoading ? [] : items}
          loading={isLoading}
          noItemsMessage={
            !isLoading
              ? i18n.translate('xpack.streams.significantEventsDiscovery.table.noItemsMessage', {
                  defaultMessage: 'No significant events found',
                })
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
