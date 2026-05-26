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
import type { Detection } from '@kbn/streams-schema';
import {
  useFetchDetections,
  useFetchDetectionHistory,
} from '../../../../../hooks/sig_events/use_fetch_detections';
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

// Unhandled detections older than this window are outside the discovery lookback
// and won't be picked up automatically by the discovery pipeline.
const DISCOVERY_LOOKBACK_MS = 2 * 60 * 60 * 1000;

const columns: Array<EuiBasicTableColumn<Detection>> = [
  {
    field: 'detected_at',
    name: i18n.translate('xpack.streams.detectionsTab.detectedAtColumn', {
      defaultMessage: 'Detected',
    }),
    width: '200px',
    render: (timestamp: string) => formatTimestamp(timestamp),
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
    width: '160px',
    render: (detection: Detection) =>
      CHANGE_TYPE_LABELS[detection.detection_evidence?.change_point_type ?? ''] ??
      detection.detection_evidence?.change_point_type ??
      '-',
  },
  {
    field: 'kind',
    name: i18n.translate('xpack.streams.detectionsTab.statusColumn', {
      defaultMessage: 'Status',
    }),
    width: '90px',
    render: (kind: string) => <EuiBadge color={kindColor(kind)}>{kindLabel(kind)}</EuiBadge>,
  },
  {
    field: 'stream_name',
    name: i18n.translate('xpack.streams.detectionsTab.streamColumn', {
      defaultMessage: 'Stream',
    }),
    width: '140px',
  },
  {
    name: i18n.translate('xpack.streams.detectionsTab.discoveryColumn', {
      defaultMessage: 'Discovery',
    }),
    width: '110px',
    render: (detection: Detection) => {
      if (detection.processed) {
        return (
          <EuiBadge color="success">
            {i18n.translate('xpack.streams.detectionsTab.discoveryProcessed', {
              defaultMessage: 'Investigated',
            })}
          </EuiBadge>
        );
      }
      const docAgeMs = Date.now() - new Date(detection['@timestamp']).getTime();
      if (docAgeMs > DISCOVERY_LOOKBACK_MS) {
        return (
          <EuiBadge color="warning">
            {i18n.translate('xpack.streams.detectionsTab.discoveryMissed', {
              defaultMessage: 'Missed',
            })}
          </EuiBadge>
        );
      }
      return null;
    },
  },
];

const DEFAULT_DETECTIONS_RANGE = { from: 'now-24h', to: 'now' };

export const DetectionsTab = () => {
  const [pickerRange, setPickerRange] = useState(DEFAULT_DETECTIONS_RANGE);
  const [absoluteRange, setAbsoluteRange] = useState(() =>
    getAbsoluteTimeRange(DEFAULT_DETECTIONS_RANGE, { forceNow: new Date() })
  );

  const handleTimeChange = ({ start: s, end: e }: { start: string; end: string }) => {
    setPickerRange({ from: s, to: e });
    setAbsoluteRange(getAbsoluteTimeRange({ from: s, to: e }, { forceNow: new Date() }));
  };

  const { data, isLoading, refetch, pagination, setPagination } = useFetchDetections({
    from: absoluteRange.from,
    to: absoluteRange.to,
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
