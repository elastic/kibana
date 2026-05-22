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
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.eventId', {
            defaultMessage: 'Event ID',
          }),
          description: selectedEvent.event_id,
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.title', {
            defaultMessage: 'Title',
          }),
          description: selectedEvent.title,
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.verdict', {
            defaultMessage: 'Verdict',
          }),
          description: selectedEvent.verdict,
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.criticality', {
            defaultMessage: 'Criticality',
          }),
          description: selectedEvent.criticality ? String(selectedEvent.criticality) : '-',
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.confidence', {
            defaultMessage: 'Confidence',
          }),
          description: selectedEvent.confidence ? String(selectedEvent.confidence) : '-',
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.summary', {
            defaultMessage: 'Summary',
          }),
          description: selectedEvent.summary,
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.rootCause', {
            defaultMessage: 'Root Cause',
          }),
          description: selectedEvent.root_cause,
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.impact', {
            defaultMessage: 'Impact',
          }),
          description: selectedEvent.impact ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.recommendedAction', {
            defaultMessage: 'Recommended Action',
          }),
          description: selectedEvent.recommended_action ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.streams', {
            defaultMessage: 'Streams',
          }),
          description: (selectedEvent.stream_names ?? []).join(', ') || '-',
        },
        {
          title: i18n.translate('xpack.streams.sigEventsTab.flyout.rules', {
            defaultMessage: 'Rules',
          }),
          description: (selectedEvent.rule_names ?? []).join(', ') || '-',
        },
      ]
    : [];

  const historyEntries = useMemo(
    () =>
      (historyData?.hits ?? []).map((entry) => ({
        timestamp: new Date(entry['@timestamp']).toLocaleString(),
        summary: entry.criticality
          ? i18n.translate('xpack.streams.sigEventsTab.historySummaryWithCriticality', {
              defaultMessage: '{verdict}: {title} (criticality: {criticality})',
              values: {
                verdict: entry.verdict,
                title: entry.title,
                criticality: String(entry.criticality),
              },
            })
          : i18n.translate('xpack.streams.sigEventsTab.historySummary', {
              defaultMessage: '{verdict}: {title}',
              values: { verdict: entry.verdict, title: entry.title },
            }),
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
          tableCaption={i18n.translate('xpack.streams.sigEventsTab.tableCaption', {
            defaultMessage: 'Significant Events',
          })}
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
            css: css`
              cursor: pointer;
            `,
          })}
        />
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
};
