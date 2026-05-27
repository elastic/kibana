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
import type { Verdict } from '@kbn/streams-schema';
import {
  useFetchVerdicts,
  useFetchVerdictHistory,
} from '../../../../../hooks/sig_events/use_fetch_verdicts';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { EntityDetailFlyout } from '../entity_detail_flyout';
import { formatTimestamp } from '../../../../../util/formatters';

const MAX_VISIBLE_STREAMS = 3;

const columns: Array<EuiBasicTableColumn<Verdict>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.verdictsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    sortable: true,
    render: (timestamp: string) => formatTimestamp(timestamp),
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
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.discoveryId', {
            defaultMessage: 'Discovery ID',
          }),
          description: selectedVerdict.discovery_id ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.verdictId', {
            defaultMessage: 'Verdict ID',
          }),
          description: selectedVerdict.verdict_id ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.title', {
            defaultMessage: 'Title',
          }),
          description: selectedVerdict.title,
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.verdict', {
            defaultMessage: 'Verdict',
          }),
          description: selectedVerdict.verdict,
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.criticality', {
            defaultMessage: 'Criticality',
          }),
          description: selectedVerdict.criticality ? String(selectedVerdict.criticality) : '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.confidence', {
            defaultMessage: 'Confidence',
          }),
          description: selectedVerdict.confidence ? String(selectedVerdict.confidence) : '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.summary', {
            defaultMessage: 'Summary',
          }),
          description: selectedVerdict.verdict_summary,
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.rootCause', {
            defaultMessage: 'Root Cause',
          }),
          description: selectedVerdict.root_cause,
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.impact', {
            defaultMessage: 'Impact',
          }),
          description: selectedVerdict.impact ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.recommendedAction', {
            defaultMessage: 'Recommended Action',
          }),
          description: selectedVerdict.recommended_action ?? '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.streams', {
            defaultMessage: 'Streams',
          }),
          description: (selectedVerdict.stream_names ?? []).join(', ') || '-',
        },
        {
          title: i18n.translate('xpack.streams.verdictsTab.flyout.rules', {
            defaultMessage: 'Rules',
          }),
          description: (selectedVerdict.rule_names ?? []).join(', ') || '-',
        },
      ]
    : [];

  const historyEntries = useMemo(
    () =>
      (historyData?.hits ?? []).map((entry) => ({
        timestamp: formatTimestamp(entry['@timestamp']),
        summary: entry.criticality
          ? i18n.translate('xpack.streams.verdictsTab.historySummaryWithCriticality', {
              defaultMessage: '{verdict}: {title} (criticality: {criticality})',
              values: {
                verdict: entry.verdict,
                title: entry.title,
                criticality: String(entry.criticality),
              },
            })
          : i18n.translate('xpack.streams.verdictsTab.historySummary', {
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
          tableCaption={i18n.translate('xpack.streams.verdictsTab.tableCaption', {
            defaultMessage: 'Verdicts',
          })}
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
            css: css`
              cursor: pointer;
            `,
          })}
        />
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
};
