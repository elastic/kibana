/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Discovery } from '@kbn/streams-schema';
import {
  useFetchDiscoveriesEntities,
  useFetchDiscoveryHistory,
} from '../../../../../hooks/sig_events/use_fetch_discoveries_entities';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { EntityDetailFlyout } from '../entity_detail_flyout';
import { formatTimestamp } from '../../../../../util/formatters';

const MAX_VISIBLE_STREAMS = 3;

const columns: Array<EuiBasicTableColumn<Discovery>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.discoveriesTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    sortable: true,
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.discoveriesTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
  },
  {
    field: 'kind',
    name: i18n.translate('xpack.streams.discoveriesTab.kindColumn', {
      defaultMessage: 'Kind',
    }),
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.discoveriesTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    render: (value: number | undefined) => (value ? String(value) : '-'),
  },
  {
    field: 'stream_names',
    name: i18n.translate('xpack.streams.discoveriesTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    render: (streamNames: string[]) => (
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {(streamNames ?? []).slice(0, MAX_VISIBLE_STREAMS).map((name) => (
          <EuiFlexItem key={name} grow={false} style={{ maxWidth: '200px' }}>
            <EuiBadge color="hollow">{name}</EuiBadge>
          </EuiFlexItem>
        ))}
        {(streamNames ?? []).length > MAX_VISIBLE_STREAMS && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">+{streamNames.length - MAX_VISIBLE_STREAMS}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  },
];

export const DiscoveriesTab = () => {
  const { timeState } = useTimefilter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();

  const { data, isLoading, refetch, pagination, setPagination } = useFetchDiscoveriesEntities({
    from: timeState.start,
    to: timeState.end,
  });
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchDiscoveryHistory(
    selectedDiscovery?.discovery_id
  );

  const onTableChange = ({ page }: { page?: { index: number; size: number } }) => {
    if (page) {
      setPagination({ page: page.index + 1, perPage: page.size });
    }
  };

  const euiPagination = {
    pageIndex: pagination.page - 1,
    pageSize: pagination.perPage,
    totalItemCount: data?.total ?? 0,
    pageSizeOptions: [10, 25, 50],
  };

  const flyoutDetails = selectedDiscovery
    ? [
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.discoveryId', {
            defaultMessage: 'Discovery ID',
          }),
          description: selectedDiscovery.discovery_id,
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.title', {
            defaultMessage: 'Title',
          }),
          description: selectedDiscovery.title,
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.kind', {
            defaultMessage: 'Kind',
          }),
          description: selectedDiscovery.kind,
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.criticality', {
            defaultMessage: 'Criticality',
          }),
          description: selectedDiscovery.criticality ? String(selectedDiscovery.criticality) : '-',
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.confidence', {
            defaultMessage: 'Confidence',
          }),
          description: selectedDiscovery.confidence ? String(selectedDiscovery.confidence) : '-',
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.summary', {
            defaultMessage: 'Summary',
          }),
          description: selectedDiscovery.summary,
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.rootCause', {
            defaultMessage: 'Root Cause',
          }),
          description: selectedDiscovery.root_cause,
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.streams', {
            defaultMessage: 'Streams',
          }),
          description: (selectedDiscovery.stream_names ?? []).join(', ') || '-',
        },
        {
          title: i18n.translate('xpack.streams.discoveriesTab.flyout.rules', {
            defaultMessage: 'Rules',
          }),
          description: (selectedDiscovery.rule_names ?? []).join(', ') || '-',
        },
      ]
    : [];

  const historyEntries = useMemo(
    () =>
      (historyData?.hits ?? []).map((entry) => ({
        timestamp: formatTimestamp(entry['@timestamp']),
        summary: entry.criticality
          ? i18n.translate('xpack.streams.discoveriesTab.historySummaryWithCriticality', {
              defaultMessage: '{title} (criticality: {criticality})',
              values: { title: entry.title, criticality: String(entry.criticality) },
            })
          : entry.title,
      })),
    [historyData]
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={rangeFrom}
              end={rangeTo}
              onTimeChange={({ start: s, end: e }) => updateTimeRange({ from: s, to: e })}
              onRefresh={() => refetch()}
              compressed
              showUpdateButton="iconOnly"
              updateButtonProps={{ size: 's', fill: false }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.streams.discoveriesTab.tableCaption', {
            defaultMessage: 'Discoveries',
          })}
          items={data?.hits ?? []}
          columns={columns}
          pagination={euiPagination}
          onChange={onTableChange}
          loading={isLoading}
          noItemsMessage={i18n.translate('xpack.streams.discoveriesTab.emptyBody', {
            defaultMessage: 'No discoveries found.',
          })}
          rowProps={(item) => ({
            onClick: () => setSelectedDiscovery(item),
            css: css`
              cursor: pointer;
            `,
          })}
        />
      </EuiFlexItem>
      {selectedDiscovery && (
        <EntityDetailFlyout
          title={selectedDiscovery.title}
          entityId={selectedDiscovery.discovery_id}
          details={flyoutDetails}
          history={historyEntries}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedDiscovery(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
