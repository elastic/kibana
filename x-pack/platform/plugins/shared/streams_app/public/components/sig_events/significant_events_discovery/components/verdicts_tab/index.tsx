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
import { i18n } from '@kbn/i18n';
import type { Verdict } from '@kbn/streams-schema';
import { useTabTimeRange } from '../../../../../hooks/sig_events/use_tab_time_range';
import {
  useFetchVerdicts,
  useFetchVerdictHistory,
} from '../../../../../hooks/sig_events/use_fetch_verdicts';
import { VerdictFlyout } from './verdict_flyout';
import { formatTimestamp } from '../../../../../util/formatters';
import { VERDICT_LABELS } from '../shared/translations';
import { VERDICT_COLORS } from '../shared/constants';

const columns: Array<EuiBasicTableColumn<Verdict>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.verdictsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    width: '200px',
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    field: 'verdict',
    name: i18n.translate('xpack.streams.verdictsTab.verdictColumn', {
      defaultMessage: 'Verdict',
    }),
    width: '110px',
    render: (v: Verdict['verdict']) => (
      <EuiBadge color={VERDICT_COLORS[v] ?? 'default'}>{VERDICT_LABELS[v] ?? v}</EuiBadge>
    ),
  },
  {
    field: 'title',
    name: i18n.translate('xpack.streams.verdictsTab.titleColumn', {
      defaultMessage: 'Title',
    }),
    truncateText: true,
  },
  {
    name: i18n.translate('xpack.streams.verdictsTab.streamsColumn', {
      defaultMessage: 'Streams',
    }),
    width: '160px',
    render: (row: Verdict) => {
      const fromEvidences = (row.evidences ?? [])
        .map((e) => e.stream_name)
        .filter((s): s is string => !!s);
      const streams = [
        ...new Set(fromEvidences.length > 0 ? fromEvidences : row.stream_names ?? []),
      ];
      return streams.length > 0 ? (
        <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
          {streams.map((name) => (
            <EuiFlexItem key={name} grow={false}>
              <EuiBadge color="hollow">{name}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ) : null;
    },
  },
  {
    field: 'criticality',
    name: i18n.translate('xpack.streams.verdictsTab.criticalityColumn', {
      defaultMessage: 'Criticality',
    }),
    width: '100px',
    render: (value: number | undefined) => (value != null ? String(value) : '-'),
  },
  {
    field: 'confidence',
    name: i18n.translate('xpack.streams.verdictsTab.confidenceColumn', {
      defaultMessage: 'Confidence',
    }),
    width: '100px',
    render: (value: number | undefined) => (value != null ? `${value}%` : '-'),
  },
];

const DEFAULT_VERDICTS_RANGE = { from: 'now-7d', to: 'now' };

export const VerdictsTab = () => {
  const { pickerRange, absoluteRange, handleTimeChange, refreshAbsoluteRange } =
    useTabTimeRange(DEFAULT_VERDICTS_RANGE);

  const { data, isLoading, refetch, pagination, setPagination } = useFetchVerdicts({
    from: absoluteRange.from,
    to: absoluteRange.to,
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiSuperDatePicker
              start={pickerRange.from}
              end={pickerRange.to}
              onTimeChange={handleTimeChange}
              onRefresh={() => {
                refreshAbsoluteRange();
                refetch();
              }}
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
          pagination={{
            pageIndex: pagination.page - 1,
            pageSize: pagination.perPage,
            totalItemCount: data?.total ?? 0,
            pageSizeOptions: [10, 25, 50],
          }}
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
        <VerdictFlyout
          verdict={selectedVerdict}
          history={historyData?.hits ?? []}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedVerdict(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
