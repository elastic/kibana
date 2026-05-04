/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, type EuiBasicTableColumn, EuiHealth, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DetectionRow } from '../types';
import { RuleLink, StreamLink } from '../links';
import { RecordsTable, renderTimestamp } from './common';

const STATUS_COLOR: Record<string, string> = {
  detected: 'danger',
  resolved: 'success',
  superseded: 'warning',
};

const CHANGE_TYPE_COLOR: Record<string, string> = {
  spike: 'danger',
  dip: 'accent',
  step_change: 'warning',
  trend_change: 'primary',
  distribution_change: 'default',
};

function changeTypeLabel(ct?: Record<string, unknown>): string {
  if (!ct) return '—';
  return Object.keys(ct)[0] ?? '—';
}

interface Props {
  items: DetectionRow[];
  loading: boolean;
  error: Error | undefined;
  onRefresh: () => void;
  selectedItem: DetectionRow | null;
  onToggleSelected: (row: DetectionRow) => void;
  onDeleteRecords: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
}

export function DetectionsTable({
  items,
  loading,
  error,
  onRefresh,
  selectedItem,
  onToggleSelected,
  onDeleteRecords,
  isDeleting,
}: Props) {
  const columns = useMemo<Array<EuiBasicTableColumn<DetectionRow>>>(
    () => [
      {
        field: '@timestamp',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.detections.timestampColumn',
          { defaultMessage: 'Timestamp' }
        ),
        width: '180px',
        render: renderTimestamp,
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.ruleColumn', {
          defaultMessage: 'Rule',
        }),
        truncateText: true,
        render: (row: DetectionRow) => (
          <EuiToolTip content={row.rule_name}>
            {/* The rule_name opens the local detection flyout (consistent
                with the row title). The dedicated rule_uuid column below
                links out to Stack Management. */}
            <EuiLink
              data-test-subj="streamsDiscoveryDetectionsRuleLink"
              onClick={() => onToggleSelected(row)}
            >
              {row.rule_name}
            </EuiLink>
          </EuiToolTip>
        ),
      },
      {
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.detections.ruleUuidColumn',
          { defaultMessage: 'Rule UUID' }
        ),
        width: '130px',
        truncateText: true,
        render: (row: DetectionRow) =>
          row.rule_uuid ? (
            <RuleLink name={`${row.rule_uuid.slice(0, 8)}…`} uuid={row.rule_uuid} />
          ) : (
            '—'
          ),
      },
      {
        field: 'stream',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.streamColumn', {
          defaultMessage: 'Stream',
        }),
        width: '180px',
        truncateText: true,
        render: (v?: string) => (v ? <StreamLink name={v} /> : '—'),
      },
      {
        field: 'status',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.statusColumn', {
          defaultMessage: 'Status',
        }),
        width: '100px',
        render: (v: string) => <EuiHealth color={STATUS_COLOR[v] ?? 'subdued'}>{v}</EuiHealth>,
      },
      {
        field: 'change_type',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.detections.changeTypeColumn',
          { defaultMessage: 'Change type' }
        ),
        width: '150px',
        render: (v: Record<string, unknown> | undefined) => {
          const label = changeTypeLabel(v);
          return <EuiBadge color={CHANGE_TYPE_COLOR[label] ?? 'default'}>{label}</EuiBadge>;
        },
      },
      {
        field: 'alert_count',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.alertsColumn', {
          defaultMessage: 'Alerts',
        }),
        width: '80px',
        align: 'right' as const,
      },
      {
        field: 'peak_30m_alert_count',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.detections.peak30mColumn',
          { defaultMessage: 'Peak 30m' }
        ),
        width: '90px',
        align: 'right' as const,
      },
      {
        field: 'detection_evidence',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.pValueColumn', {
          defaultMessage: 'p-value',
        }),
        width: '90px',
        align: 'right' as const,
        render: (v?: { p_value?: number }) =>
          v?.p_value != null ? v.p_value.toExponential(2) : '—',
      },
      {
        field: 'processed_by',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.detections.processedColumn',
          { defaultMessage: 'Processed' }
        ),
        width: '100px',
        render: (v?: string) =>
          v ? (
            <EuiBadge color="success">
              {i18n.translate(
                'xpack.streams.sigEventsDiscovery.multiStep.detections.processedYes',
                { defaultMessage: 'yes' }
              )}
            </EuiBadge>
          ) : (
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.detections.processedNo', {
                defaultMessage: 'no',
              })}
            </EuiBadge>
          ),
      },
    ],
    [onToggleSelected]
  );

  return (
    <RecordsTable<DetectionRow>
      items={items}
      columns={columns}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      selectedItem={selectedItem}
      onToggleSelected={onToggleSelected}
      onDeleteRecords={onDeleteRecords}
      isDeleting={isDeleting}
      rowHeader="rule_name"
      itemsLabel={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.detections.itemsLabel',
        { defaultMessage: 'detections' }
      )}
      searchableFields={['rule_name', 'rule_uuid', 'stream', 'status']}
      tableCaption={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.detections.tableCaption',
        { defaultMessage: 'Detections produced by the multi-step pipeline.' }
      )}
      emptyMessage={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.detections.emptyMessage',
        { defaultMessage: 'No detections found in sigevents-detections-ms.' }
      )}
      errorTitle={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.detections.errorTitle',
        { defaultMessage: 'Failed to load detections' }
      )}
    />
  );
}
