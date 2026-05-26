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
import type { Detection } from '@kbn/streams-schema';
import {
  useFetchDetections,
  useFetchDetectionHistory,
} from '../../../../../hooks/sig_events/use_fetch_detections';
import { useTimefilter } from '../../../../../hooks/use_timefilter';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../../../hooks/use_time_range_update';
import { DetectionFlyout } from '../detection_flyout';
import { formatTimestamp } from '../../../../../util/formatters';

const KIND_LABELS: Record<string, string> = {
  detection: i18n.translate('xpack.streams.detectionsTab.statusActive', {
    defaultMessage: 'Active',
  }),
  quiet: i18n.translate('xpack.streams.detectionsTab.statusQuiet', {
    defaultMessage: 'Quiet',
  }),
  // kept for history view which shows all doc kinds
  handled: i18n.translate('xpack.streams.detectionsTab.statusHandled', {
    defaultMessage: 'Investigated',
  }),
};

const KIND_COLORS: Record<string, string> = {
  detection: 'warning',
  quiet: 'default',
  handled: 'primary',
};

const kindLabel = (kind: string) => KIND_LABELS[kind] ?? kind;
const kindColor = (kind: string) => KIND_COLORS[kind] ?? 'default';

const CHANGE_TYPE_LABELS: Record<string, string> = {
  distribution_change: i18n.translate('xpack.streams.detectionsTab.changeType.distribution', {
    defaultMessage: 'Distribution shift',
  }),
  spike: i18n.translate('xpack.streams.detectionsTab.changeType.spike', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('xpack.streams.detectionsTab.changeType.dip', { defaultMessage: 'Dip' }),
  step_change: i18n.translate('xpack.streams.detectionsTab.changeType.step', {
    defaultMessage: 'Step change',
  }),
  stationary: i18n.translate('xpack.streams.detectionsTab.changeType.stationary', {
    defaultMessage: 'Returned to baseline',
  }),
};

const columns: Array<EuiBasicTableColumn<Detection>> = [
  {
    field: 'kind',
    name: i18n.translate('xpack.streams.detectionsTab.statusColumn', {
      defaultMessage: 'Status',
    }),
    width: '90px',
    render: (kind: string) => <EuiBadge color={kindColor(kind)}>{kindLabel(kind)}</EuiBadge>,
  },
  {
    field: 'rule_name',
    name: i18n.translate('xpack.streams.detectionsTab.ruleColumn', {
      defaultMessage: 'Rule',
    }),
  },
  {
    name: i18n.translate('xpack.streams.detectionsTab.changeTypeColumn', {
      defaultMessage: 'Change',
    }),
    render: (detection: Detection) =>
      CHANGE_TYPE_LABELS[detection.detection_evidence?.change_point_type ?? ''] ??
      detection.detection_evidence?.change_point_type ??
      '-',
  },
  {
    field: 'stream_name',
    name: i18n.translate('xpack.streams.detectionsTab.streamColumn', {
      defaultMessage: 'Stream',
    }),
  },
  {
    field: 'detected_at',
    name: i18n.translate('xpack.streams.detectionsTab.detectedAtColumn', {
      defaultMessage: 'Detected',
    }),
    sortable: true,
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    field: 'processed',
    name: i18n.translate('xpack.streams.detectionsTab.investigatedColumn', {
      defaultMessage: 'Investigated',
    }),
    width: '100px',
    render: (processed: boolean) =>
      processed ? (
        <EuiBadge color="success">
          {i18n.translate('xpack.streams.detectionsTab.investigatedYes', {
            defaultMessage: 'Yes',
          })}
        </EuiBadge>
      ) : null,
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
          tableCaption={i18n.translate('xpack.streams.detectionsTab.tableCaption', {
            defaultMessage: 'Detections',
          })}
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
            css: css`
              cursor: pointer;
            `,
          })}
        />
      </EuiFlexItem>
      {selectedDetection && (
        <DetectionFlyout
          detection={selectedDetection}
          history={historyData?.hits ?? []}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedDetection(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
