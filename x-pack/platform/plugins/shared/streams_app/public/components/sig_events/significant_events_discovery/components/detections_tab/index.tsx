/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
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
import { RUNNING_POLL_INTERVAL_MS } from '../../../constants';
import { useFetchDetections } from '../../../../../hooks/sig_events/use_fetch_detections';
import { useTabTimeRange } from '../../../../../hooks/sig_events/use_tab_time_range';
import { useSignificantEventsDiscoveryContext } from '../../context/significant_events_discovery_context';
import { DetectionFlyout } from './detection_flyout';
import { FindSignificantEventsButton } from '../streams_view/find_significant_events_button';
import { formatTimestamp } from '../../../../../util/formatters';
import { CHANGE_TYPE_LABELS, DETECTION_KIND_LABELS } from '../shared/translations';
import { DETECTION_KIND_COLORS } from '../shared/constants';

const DISCOVERY_STATUS_LABELS = {
  processed: i18n.translate('xpack.streams.detectionsTab.statusProcessed', {
    defaultMessage: 'Processed',
  }),
  missed: i18n.translate('xpack.streams.detectionsTab.statusMissed', {
    defaultMessage: 'Missed',
  }),
  pending: i18n.translate('xpack.streams.detectionsTab.statusPending', {
    defaultMessage: 'Pending',
  }),
};

const kindLabel = (kind: Detection['kind']) => DETECTION_KIND_LABELS[kind] ?? kind;
const kindColor = (kind: Detection['kind']) => DETECTION_KIND_COLORS[kind] ?? 'default';

// Unhandled detections older than this window are outside the discovery lookback
// and won't be picked up automatically by the discovery pipeline.
const DISCOVERY_LOOKBACK_MS = 2 * 60 * 60 * 1000;

const columns: Array<EuiBasicTableColumn<Detection>> = [
  {
    field: 'detected_at',
    name: i18n.translate('xpack.streams.detectionsTab.timestampColumn', {
      defaultMessage: 'Timestamp',
    }),
    width: '200px',
    render: (timestamp: string) => formatTimestamp(timestamp),
  },
  {
    field: 'kind',
    name: i18n.translate('xpack.streams.detectionsTab.kindColumn', {
      defaultMessage: 'Kind',
    }),
    width: '100px',
    render: (kind: Detection['kind']) => (
      <EuiBadge color={kindColor(kind)}>{kindLabel(kind)}</EuiBadge>
    ),
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
    width: '140px',
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
    name: i18n.translate('xpack.streams.detectionsTab.discoveryColumn', {
      defaultMessage: 'Discovery',
    }),
    width: '110px',
    render: (detection: Detection) => {
      if (detection.processed) {
        return <EuiBadge color="success">{DISCOVERY_STATUS_LABELS.processed}</EuiBadge>;
      }
      const docAgeMs =
        Date.now() - new Date(detection.detected_at ?? detection['@timestamp']).getTime();
      if (docAgeMs > DISCOVERY_LOOKBACK_MS) {
        return <EuiBadge color="warning">{DISCOVERY_STATUS_LABELS.missed}</EuiBadge>;
      }
      return <EuiBadge color="hollow">{DISCOVERY_STATUS_LABELS.pending}</EuiBadge>;
    },
  },
];

const DEFAULT_DETECTIONS_RANGE = { from: 'now-24h', to: 'now' };

export const DetectionsTab = () => {
  const { pickerRange, absoluteRange, handleTimeChange, refreshAbsoluteRange } =
    useTabTimeRange(DEFAULT_DETECTIONS_RANGE);

  const { isRunning, isCanceling, handleRun, handleCancel } =
    useSignificantEventsDiscoveryContext();

  // Discovery state is shared at the provider level, so re-resolve this tab's
  // locked time range locally when a run finishes (isRunning true -> false) to
  // surface documents generated after the range was frozen.
  const wasRunningRef = useRef(isRunning);
  useEffect(() => {
    if (wasRunningRef.current && !isRunning) {
      refreshAbsoluteRange();
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, refreshAbsoluteRange]);

  const { data, isLoading, refetch, pagination, setPagination } = useFetchDetections({
    from: absoluteRange.from,
    to: absoluteRange.to,
  });
  useInterval(refetch, isRunning ? RUNNING_POLL_INTERVAL_MS : null);

  const [selectedDetection, setSelectedDetection] = useState<Detection | undefined>();

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
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center">
          <EuiFlexItem>
            <EuiSuperDatePicker
              start={pickerRange.from}
              end={pickerRange.to}
              onTimeChange={handleTimeChange}
              onRefresh={() => {
                refreshAbsoluteRange();
                refetch();
              }}
              compressed
              width="full"
              showUpdateButton="iconOnly"
              updateButtonProps={{ size: 's', fill: false }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <FindSignificantEventsButton
              onRun={handleRun}
              onCancel={handleCancel}
              isRunning={isRunning}
              isCanceling={isCanceling}
              isDisabled={isRunning}
              size="s"
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
          onClose={() => setSelectedDetection(undefined)}
        />
      )}
    </EuiFlexGroup>
  );
};
