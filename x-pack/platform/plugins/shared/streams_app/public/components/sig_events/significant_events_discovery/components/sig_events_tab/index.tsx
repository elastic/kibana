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
import type { Verdict } from '@kbn/streams-schema';
import {
  useFetchVerdicts,
  useFetchVerdictHistory,
} from '../../../../../hooks/sig_events/use_fetch_verdicts';
import { SigEventsFlyout } from '../sig_events_flyout';
import { formatTimestamp } from '../../../../../util/formatters';

const VERDICT_LABELS: Record<string, string> = {
  promoted: i18n.translate('xpack.streams.verdictsTab.verdict.promoted', {
    defaultMessage: 'Promoted',
  }),
  demoted: i18n.translate('xpack.streams.verdictsTab.verdict.demoted', {
    defaultMessage: 'Demoted',
  }),
  acknowledged: i18n.translate('xpack.streams.verdictsTab.verdict.acknowledged', {
    defaultMessage: 'Acknowledged',
  }),
};

const VERDICT_COLORS: Record<string, string> = {
  promoted: 'warning',
  demoted: 'success',
  acknowledged: 'primary',
};

const columns: Array<EuiBasicTableColumn<Verdict>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.verdictsTab.timestampColumn', {
      defaultMessage: 'Last verdict',
    }),
    width: '200px',
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
    width: '110px',
    render: (v: string) => (
      <EuiBadge color={VERDICT_COLORS[v] ?? 'default'}>{VERDICT_LABELS[v] ?? v}</EuiBadge>
    ),
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
    render: (value: number | undefined) => (value != null ? String(value) : '-'),
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
];

const DEFAULT_SIG_EVENTS_RANGE = { from: 'now-7d', to: 'now' };

export const SigEventsTab = () => {
  const [pickerRange, setPickerRange] = useState(DEFAULT_SIG_EVENTS_RANGE);
  const [absoluteRange, setAbsoluteRange] = useState(() =>
    getAbsoluteTimeRange(DEFAULT_SIG_EVENTS_RANGE, { forceNow: new Date() })
  );

  const handleTimeChange = ({ start: s, end: e }: { start: string; end: string }) => {
    setPickerRange({ from: s, to: e });
    setAbsoluteRange(getAbsoluteTimeRange({ from: s, to: e }, { forceNow: new Date() }));
  };

  const { data, isLoading, refetch, pagination, setPagination } = useFetchVerdicts({
    from: absoluteRange.from,
    to: absoluteRange.to,
  });
  const [selectedVerdict, setSelectedVerdict] = useState<Verdict | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchVerdictHistory(
    selectedVerdict?.discovery_slug
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
              onRefresh={() => {
                setAbsoluteRange(getAbsoluteTimeRange(pickerRange, { forceNow: new Date() }));
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
        <SigEventsFlyout
          verdict={selectedVerdict}
          history={historyData?.hits ?? []}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedVerdict(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
