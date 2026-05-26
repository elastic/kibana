/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { getAbsoluteTimeRange } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import type { Discovery } from '@kbn/streams-schema';
import {
  useFetchDiscoveriesEntities,
  useFetchDiscoveryHistory,
} from '../../../../../hooks/sig_events/use_fetch_discoveries_entities';
import { DiscoveryFlyout } from '../discovery_flyout';
import { formatTimestamp } from '../../../../../util/formatters';

const MAX_VISIBLE_STREAMS = 3;

const KIND_LABELS: Record<string, string> = {
  finding: i18n.translate('xpack.streams.discoveriesTab.kind.finding', {
    defaultMessage: 'Finding',
  }),
  clearance: i18n.translate('xpack.streams.discoveriesTab.kind.clearance', {
    defaultMessage: 'Cleared',
  }),
};

const KIND_COLORS: Record<string, string> = { finding: 'warning', clearance: 'success' };

const columns: Array<EuiBasicTableColumn<Discovery>> = [
  {
    field: 'kind',
    name: i18n.translate('xpack.streams.discoveriesTab.statusColumn', {
      defaultMessage: 'Status',
    }),
    width: '90px',
    render: (kind: string) => (
      <EuiBadge color={KIND_COLORS[kind] ?? 'default'}>{KIND_LABELS[kind] ?? kind}</EuiBadge>
    ),
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.discoveriesTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.discoveriesTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    width: '100px',
    render: (value: number | undefined) => (value != null ? String(value) : '-'),
  },
  {
    field: 'confidence',
    name: i18n.translate('xpack.streams.discoveriesTab.confidenceColumn', {
      defaultMessage: 'Confidence',
    }),
    width: '100px',
    render: (value: number | undefined) => (value != null ? String(value) : '-'),
  },
  {
    field: 'discovered_at',
    name: i18n.translate('xpack.streams.discoveriesTab.foundColumn', {
      defaultMessage: 'Found',
    }),
    render: (discoveredAt: string | undefined, discovery: Discovery) =>
      formatTimestamp(discoveredAt ?? discovery['@timestamp']),
  },
  {
    name: i18n.translate('xpack.streams.discoveriesTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    render: (discovery: Discovery) => {
      const streamNames = [
        ...new Set(
          (discovery.detections ?? []).map((d) => d.stream_name).filter((s): s is string => !!s)
        ),
      ];
      return (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {streamNames.slice(0, MAX_VISIBLE_STREAMS).map((name) => (
            <EuiFlexItem key={name} grow={false} style={{ maxWidth: '200px' }}>
              <EuiBadge color="hollow">{name}</EuiBadge>
            </EuiFlexItem>
          ))}
          {streamNames.length > MAX_VISIBLE_STREAMS && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">+{streamNames.length - MAX_VISIBLE_STREAMS}</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      );
    },
  },
];

const DEFAULT_DISCOVERIES_RANGE = { from: 'now-7d', to: 'now' };

export const DiscoveriesTab = () => {
  const [pickerRange, setPickerRange] = useState(DEFAULT_DISCOVERIES_RANGE);
  const [absoluteRange, setAbsoluteRange] = useState(() =>
    getAbsoluteTimeRange(DEFAULT_DISCOVERIES_RANGE, { forceNow: new Date() })
  );

  const handleTimeChange = ({ start: s, end: e }: { start: string; end: string }) => {
    setPickerRange({ from: s, to: e });
    setAbsoluteRange(getAbsoluteTimeRange({ from: s, to: e }, { forceNow: new Date() }));
  };

  const { data, isLoading, refetch, pagination, setPagination } = useFetchDiscoveriesEntities({
    from: absoluteRange.from,
    to: absoluteRange.to,
  });
  const [selectedDiscovery, setSelectedDiscovery] = useState<Discovery | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchDiscoveryHistory(
    selectedDiscovery?.discovery_slug
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={pickerRange.from}
              end={pickerRange.to}
              onTimeChange={handleTimeChange}
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
        <DiscoveryFlyout
          discovery={selectedDiscovery}
          history={historyData?.hits ?? []}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedDiscovery(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
