/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiBasicTable, EuiBadge, EuiSpacer, EuiSuperDatePicker } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Detection } from '@kbn/streams-schema';
import {
  useFetchDetections,
  useFetchDetectionHistory,
} from '../../../../../hooks/sig_events/use_fetch_detections';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { EntityDetailFlyout } from '../entity_detail_flyout';

const columns: Array<EuiBasicTableColumn<Detection>> = [
  {
    field: '@timestamp',
    name: i18n.translate('xpack.streams.detectionsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    sortable: true,
    render: (timestamp: string) => new Date(timestamp).toLocaleString(),
  },
  {
    field: 'rule_name',
    name: i18n.translate('xpack.streams.detectionsTab.ruleColumn', {
      defaultMessage: 'Rule',
    }),
  },
  {
    field: 'stream_name',
    name: i18n.translate('xpack.streams.detectionsTab.streamColumn', {
      defaultMessage: 'Stream',
    }),
  },
  {
    field: 'peak_30m_alert_count',
    name: i18n.translate('xpack.streams.detectionsTab.alertCountColumn', {
      defaultMessage: 'Peak alerts (30m)',
    }),
  },
  {
    field: 'processed',
    name: i18n.translate('xpack.streams.detectionsTab.processedColumn', {
      defaultMessage: 'Processed',
    }),
    render: (processed: boolean) => (
      <EuiBadge color={processed ? 'success' : 'default'}>{processed ? 'Yes' : 'No'}</EuiBadge>
    ),
  },
];

export const DetectionsTab = () => {
  const { timeState } = useTimefilter();
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();

  const { data, isLoading, refetch, pagination, setPagination } = useFetchDetections({
    from: timeState.start,
    to: timeState.end,
  });
  const [selectedDetection, setSelectedDetection] = useState<Detection | undefined>();

  const { data: historyData, isLoading: isHistoryLoading } = useFetchDetectionHistory(
    selectedDetection?.detection_id
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

  const flyoutDetails = selectedDetection
    ? [
        { title: 'Detection ID', description: selectedDetection.detection_id ?? '-' },
        { title: 'Rule', description: selectedDetection.rule_name ?? '-' },
        { title: 'Rule UUID', description: selectedDetection.rule_uuid ?? '-' },
        { title: 'Stream', description: selectedDetection.stream_name ?? '-' },
        {
          title: 'Peak alerts (30m)',
          description: String(selectedDetection.peak_30m_alert_count ?? '-'),
        },
        { title: 'Silent', description: selectedDetection.silent ? 'Yes' : 'No' },
        { title: 'Processed', description: selectedDetection.processed ? 'Yes' : 'No' },
      ]
    : [];

  const historyEntries = useMemo(
    () =>
      (historyData?.hits ?? []).map((entry) => ({
        timestamp: new Date(entry['@timestamp']).toLocaleString(),
        summary: `Rule: ${entry.rule_name ?? '-'}, Peak 30m: ${
          entry.peak_30m_alert_count ?? '-'
        }, Processed: ${entry.processed ? 'Yes' : 'No'}`,
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
        tableCaption="Detections"
        items={data?.hits ?? []}
        columns={columns}
        pagination={euiPagination}
        onChange={onTableChange}
        loading={isLoading}
        noItemsMessage={i18n.translate('xpack.streams.detectionsTab.emptyBody', {
          defaultMessage: 'No detections found.',
        })}
        rowProps={(item) => ({
          onClick: () => setSelectedDetection(item),
          style: { cursor: 'pointer' },
        })}
      />
      {selectedDetection && (
        <EntityDetailFlyout
          title={selectedDetection.rule_name ?? 'Detection'}
          entityId={selectedDetection.detection_id ?? '-'}
          details={flyoutDetails}
          history={historyEntries}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedDetection(undefined)}
        />
      )}
    </div>
  );
};
