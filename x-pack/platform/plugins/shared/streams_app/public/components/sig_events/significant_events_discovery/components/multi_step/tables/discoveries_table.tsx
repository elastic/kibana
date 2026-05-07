/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, type EuiBasicTableColumn, EuiHealth, EuiLink, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DiscoveryItemRow } from '../types';
import {
  ACTION_COLOR,
  criticalityColor,
  RecordsTable,
  renderMonoId,
  renderStreamBadges,
  renderTimestamp,
} from './common';

const STATUS_COLOR: Record<string, string> = {
  active: 'danger',
  detections_cleared: 'success',
  superseded: 'subdued',
};

interface Props {
  items: DiscoveryItemRow[];
  loading: boolean;
  error: Error | undefined;
  onRefresh: () => void;
  selectedItem: DiscoveryItemRow | null;
  onToggleSelected: (row: DiscoveryItemRow) => void;
  onDeleteRecords: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
}

export function DiscoveriesTable({
  items,
  loading,
  error,
  onRefresh,
  selectedItem,
  onToggleSelected,
  onDeleteRecords,
  isDeleting,
}: Props) {
  const columns = useMemo<Array<EuiBasicTableColumn<DiscoveryItemRow>>>(
    () => [
      {
        field: '@timestamp',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.timestampColumn',
          { defaultMessage: 'Timestamp' }
        ),
        width: '180px',
        render: renderTimestamp,
      },
      {
        field: 'discovery_id',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.discoveryIdColumn',
          { defaultMessage: 'Discovery ID' }
        ),
        width: '200px',
        truncateText: true,
        render: renderMonoId,
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.discoveries.titleColumn', {
          defaultMessage: 'Title',
        }),
        truncateText: true,
        render: (row: DiscoveryItemRow) => (
          <EuiToolTip content={row.title}>
            <EuiLink
              data-test-subj="streamsDiscoveryDiscoveriesTitleLink"
              onClick={() => onToggleSelected(row)}
            >
              {row.title}
            </EuiLink>
          </EuiToolTip>
        ),
      },
      {
        field: 'status',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.statusColumn',
          { defaultMessage: 'Status' }
        ),
        width: '90px',
        render: (v: string) => <EuiHealth color={STATUS_COLOR[v] ?? 'subdued'}>{v}</EuiHealth>,
      },
      {
        field: 'review_context',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.contextColumn',
          { defaultMessage: 'Context' }
        ),
        width: '110px',
        render: (v?: string) => (v ? <EuiBadge color="hollow">{v}</EuiBadge> : '—'),
      },
      {
        field: 'criticality',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.criticalityColumn',
          { defaultMessage: 'Criticality' }
        ),
        width: '100px',
        align: 'right' as const,
        render: (v: number) => <EuiBadge color={criticalityColor(v)}>{v}</EuiBadge>,
      },
      {
        field: 'confidence',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.confidenceColumn',
          { defaultMessage: 'Confidence' }
        ),
        width: '90px',
        align: 'right' as const,
        render: (v?: number) => (v != null ? `${v}%` : '—'),
      },
      {
        field: 'recommended_action',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.actionColumn',
          { defaultMessage: 'Action' }
        ),
        width: '120px',
        render: (v?: string) =>
          v ? <EuiBadge color={ACTION_COLOR[v] ?? 'default'}>{v}</EuiBadge> : '—',
      },
      {
        field: 'stream_names',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.discoveries.streamsColumn',
          { defaultMessage: 'Streams' }
        ),
        width: '220px',
        render: renderStreamBadges,
      },
      {
        field: 'rule_names',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.discoveries.rulesColumn', {
          defaultMessage: 'Rules',
        }),
        width: '70px',
        align: 'right' as const,
        render: (v?: string[]) => (Array.isArray(v) ? v.length : '—'),
      },
    ],
    [onToggleSelected]
  );

  return (
    <RecordsTable<DiscoveryItemRow>
      items={items}
      columns={columns}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      selectedItem={selectedItem}
      onToggleSelected={onToggleSelected}
      onDeleteRecords={onDeleteRecords}
      isDeleting={isDeleting}
      rowHeader="discovery_id"
      itemsLabel={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.discoveries.itemsLabel',
        { defaultMessage: 'discoveries' }
      )}
      searchableFields={['title', 'discovery_id', 'status', 'review_context', 'recommended_action']}
      tableCaption={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.discoveries.tableCaption',
        {
          defaultMessage: 'Candidate incidents grouped from detections by the multi-step pipeline.',
        }
      )}
      emptyMessage={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.discoveries.emptyMessage',
        { defaultMessage: 'No discoveries found in sigevents-discoveries-ms.' }
      )}
      errorTitle={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.discoveries.errorTitle',
        { defaultMessage: 'Failed to load discoveries' }
      )}
    />
  );
}
