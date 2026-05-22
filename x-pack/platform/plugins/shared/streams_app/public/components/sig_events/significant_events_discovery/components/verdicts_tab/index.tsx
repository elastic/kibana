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
  EuiSpacer,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Verdict } from '@kbn/streams-schema';
import {
  useFetchVerdicts,
  useFetchVerdictHistory,
} from '../../../../../hooks/sig_events/use_fetch_verdicts';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { EntityDetailFlyout } from '../entity_detail_flyout';

const columns: Array<EuiBasicTableColumn<Verdict>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.verdictsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    sortable: true,
    render: (timestamp: string) => new Date(timestamp).toLocaleString(),
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.verdictsTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
  },
  {
    field: 'verdict',
    name: i18n.translate('xpack.streams.verdictsTab.verdictColumn', {
      defaultMessage: 'Verdict',
    }),
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.verdictsTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    render: (value: number | undefined) => (value ? String(value) : '-'),
  },
  {
    field: 'confidence',
    name: i18n.translate('xpack.streams.verdictsTab.confidenceColumn', {
      defaultMessage: 'Confidence',
    }),
    render: (value: number | undefined) => (value ? String(value) : '-'),
  },
  {
    field: 'stream_names',
    name: i18n.translate('xpack.streams.verdictsTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    render: (streamNames: string[]) => (
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {(streamNames ?? []).slice(0, 3).map((name) => (
          <EuiFlexItem key={name} grow={false}>
            <EuiBadge color="hollow">{name}</EuiBadge>
          </EuiFlexItem>
        ))}
        {(streamNames ?? []).length > 3 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">+{streamNames.length - 3}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  },
];

export const VerdictsTab = () => {
  const { timeState } = useTimefilter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();

  const { data, isLoading, refetch, pagination, setPagination } = useFetchVerdicts({
    from: timeState.start,
    to: timeState.end,
  });
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchVerdictHistory(
    selectedVerdict?.discovery_id
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

  const flyoutDetails = selectedVerdict
    ? [
        { title: 'Discovery ID', description: selectedVerdict.discovery_id ?? '-' },
        { title: 'Verdict ID', description: selectedVerdict.verdict_id ?? '-' },
        { title: 'Title', description: selectedVerdict.title },
        { title: 'Verdict', description: selectedVerdict.verdict },
        {
          title: 'Criticality',
          description: selectedVerdict.criticality ? String(selectedVerdict.criticality) : '-',
        },
        {
          title: 'Confidence',
          description: selectedVerdict.confidence ? String(selectedVerdict.confidence) : '-',
        },
        { title: 'Summary', description: selectedVerdict.verdict_summary },
        { title: 'Root Cause', description: selectedVerdict.root_cause },
        { title: 'Impact', description: selectedVerdict.impact ?? '-' },
        { title: 'Recommended Action', description: selectedVerdict.recommended_action ?? '-' },
        {
          title: 'Streams',
          description: (selectedVerdict.stream_names ?? []).join(', ') || '-',
        },
        {
          title: 'Rules',
          description: (selectedVerdict.rule_names ?? []).join(', ') || '-',
        },
      ]
    : [];

  const historyEntries = useMemo(
    () =>
      (historyData?.hits ?? []).map((entry) => ({
        timestamp: new Date(entry['@timestamp']).toLocaleString(),
        summary: entry.criticality
          ? `${entry.verdict}: ${entry.title} (criticality: ${entry.criticality})`
          : `${entry.verdict}: ${entry.title}`,
      })),
    [historyData]
  );

  return (
    <div css={{ flex: '0 0 auto' }}>
      <div css={{ display: 'flex', justifyContent: 'flex-end' }}>
        <EuiSuperDatePicker
          start={rangeFrom}
          end={rangeTo}
          onTimeChange={({ start: s, end: e }) => updateTimeRange({ from: s, to: e })}
          onRefresh={() => refetch()}
          compressed
          showUpdateButton="iconOnly"
          updateButtonProps={{ size: 's', fill: false }}
        />
      </div>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption="Verdicts"
        items={data?.hits ?? []}
        columns={columns}
        pagination={euiPagination}
        onChange={onTableChange}
        loading={isLoading}
        noItemsMessage={i18n.translate('xpack.streams.verdictsTab.emptyBody', {
          defaultMessage: 'No verdicts found.',
        })}
        rowProps={(item) => ({
          onClick: () => setSelectedVerdict(item),
          style: { cursor: 'pointer' },
        })}
      />
      {selectedVerdict && (
        <EntityDetailFlyout
          title={selectedVerdict.title}
          entityId={selectedVerdict.discovery_id ?? '-'}
          details={flyoutDetails}
          history={historyEntries}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedVerdict(undefined)}
        />
      )}
    </div>
  );
};
