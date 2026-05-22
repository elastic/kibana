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
import type { SigEvent } from '@kbn/streams-schema';
import {
  useFetchSigEvents,
  useFetchSigEventHistory,
} from '../../../../../hooks/sig_events/use_fetch_sig_events';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { EntityDetailFlyout } from '../entity_detail_flyout';

const columns: Array<EuiBasicTableColumn<SigEvent>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.sigEventsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    sortable: true,
    render: (timestamp: string) => new Date(timestamp).toLocaleString(),
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.sigEventsTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
  },
  {
    field: 'verdict',
    name: i18n.translate('xpack.streams.sigEventsTab.verdictColumn', {
      defaultMessage: 'Verdict',
    }),
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.sigEventsTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    render: (value: number | undefined) => (value ? String(value) : '-'),
  },
  {
    field: 'stream_names',
    name: i18n.translate('xpack.streams.sigEventsTab.streamsColumn', {
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
  {
    field: 'rule_names',
    name: i18n.translate('xpack.streams.sigEventsTab.rulesColumn', {
      defaultMessage: 'Rules',
    }),
    render: (ruleNames: string[]) => (
      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {(ruleNames ?? []).slice(0, 2).map((name) => (
          <EuiFlexItem key={name} grow={false}>
            <EuiBadge color="hollow">{name}</EuiBadge>
          </EuiFlexItem>
        ))}
        {(ruleNames ?? []).length > 2 && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">+{ruleNames.length - 2}</EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    ),
  },
];

export const SigEventsTab = () => {
  const { timeState } = useTimefilter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();

  const { data, isLoading, refetch, pagination, setPagination } = useFetchSigEvents({
    from: timeState.start,
    to: timeState.end,
  });
  const [selectedEvent, setSelectedEvent] = useState<SigEvent | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchSigEventHistory(
    selectedEvent?.event_id
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

  const flyoutDetails = selectedEvent
    ? [
        { title: 'Event ID', description: selectedEvent.event_id },
        { title: 'Title', description: selectedEvent.title },
        { title: 'Verdict', description: selectedEvent.verdict },
        {
          title: 'Criticality',
          description: selectedEvent.criticality ? String(selectedEvent.criticality) : '-',
        },
        {
          title: 'Confidence',
          description: selectedEvent.confidence ? String(selectedEvent.confidence) : '-',
        },
        { title: 'Summary', description: selectedEvent.summary },
        { title: 'Root Cause', description: selectedEvent.root_cause },
        { title: 'Impact', description: selectedEvent.impact ?? '-' },
        { title: 'Recommended Action', description: selectedEvent.recommended_action ?? '-' },
        {
          title: 'Streams',
          description: (selectedEvent.stream_names ?? []).join(', ') || '-',
        },
        {
          title: 'Rules',
          description: (selectedEvent.rule_names ?? []).join(', ') || '-',
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
        tableCaption="Significant Events"
        items={data?.hits ?? []}
        columns={columns}
        pagination={euiPagination}
        onChange={onTableChange}
        loading={isLoading}
        noItemsMessage={i18n.translate('xpack.streams.sigEventsTab.emptyBody', {
          defaultMessage: 'No significant events found.',
        })}
        rowProps={(item) => ({
          onClick: () => setSelectedEvent(item),
          style: { cursor: 'pointer' },
        })}
      />
      {selectedEvent && (
        <EntityDetailFlyout
          title={selectedEvent.title}
          entityId={selectedEvent.event_id}
          details={flyoutDetails}
          history={historyEntries}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedEvent(undefined)}
        />
      )}
    </div>
  );
};
