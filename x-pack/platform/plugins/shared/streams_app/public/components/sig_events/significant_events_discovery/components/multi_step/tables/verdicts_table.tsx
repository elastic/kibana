/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  type EuiBasicTableColumn,
  EuiHealth,
  EuiLink,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DiscoveryKind } from '../../../../../../hooks/sig_events/use_discovery_records';
import type { VerdictRow } from '../types';
import { ACTION_COLOR, criticalityColor, RecordsTable, renderTimestamp } from './common';

const VERDICT_COLOR: Record<string, string> = {
  promoted: 'danger',
  acknowledged: 'warning',
  demoted: 'default',
  challenge: 'accent',
};

interface Props {
  items: VerdictRow[];
  loading: boolean;
  error: Error | undefined;
  onRefresh: () => void;
  selectedItem: VerdictRow | null;
  onToggleSelected: (row: VerdictRow) => void;
  onDeleteRecords: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  onNavigateTo: (kind: DiscoveryKind, id: string) => void;
}

export function VerdictsTable({
  items,
  loading,
  error,
  onRefresh,
  selectedItem,
  onToggleSelected,
  onDeleteRecords,
  isDeleting,
  onNavigateTo,
}: Props) {
  const columns = useMemo<Array<EuiBasicTableColumn<VerdictRow>>>(
    () => [
      {
        field: '@timestamp',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.verdicts.timestampColumn',
          { defaultMessage: 'Timestamp' }
        ),
        width: '180px',
        render: renderTimestamp,
      },
      {
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.verdicts.discoveryIdColumn',
          { defaultMessage: 'Discovery ID' }
        ),
        width: '220px',
        truncateText: true,
        render: (row: VerdictRow) => (
          <EuiToolTip
            content={i18n.translate(
              'xpack.streams.sigEventsDiscovery.multiStep.verdicts.openDiscoveryTooltip',
              { defaultMessage: 'Open the matching discovery' }
            )}
          >
            <EuiLink
              data-test-subj="streamsDiscoveryVerdictsDiscoveryLink"
              onClick={() => onNavigateTo('discoveries', row.discovery_id)}
            >
              <EuiText size="xs">
                <code>{row.discovery_id}</code>
              </EuiText>
            </EuiLink>
          </EuiToolTip>
        ),
      },
      {
        field: 'verdict',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.verdicts.verdictColumn', {
          defaultMessage: 'Verdict',
        }),
        width: '120px',
        render: (v: string) => <EuiHealth color={VERDICT_COLOR[v] ?? 'subdued'}>{v}</EuiHealth>,
      },
      {
        field: 'criticality',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.verdicts.criticalityColumn',
          { defaultMessage: 'Criticality' }
        ),
        width: '100px',
        align: 'right' as const,
        render: (v: number) => <EuiBadge color={criticalityColor(v)}>{v}</EuiBadge>,
      },
      {
        field: 'recommended_action',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.verdicts.actionColumn', {
          defaultMessage: 'Action',
        }),
        width: '120px',
        render: (v: string) => <EuiBadge color={ACTION_COLOR[v] ?? 'default'}>{v}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.verdicts.summaryColumn', {
          defaultMessage: 'Summary',
        }),
        truncateText: true,
        render: (row: VerdictRow) => (
          <EuiToolTip content={row.verdict_summary}>
            <EuiLink
              data-test-subj="streamsDiscoveryVerdictsSummaryLink"
              onClick={() => onToggleSelected(row)}
            >
              {row.verdict_summary}
            </EuiLink>
          </EuiToolTip>
        ),
      },
    ],
    [onNavigateTo, onToggleSelected]
  );

  return (
    <RecordsTable<VerdictRow>
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
      itemsLabel={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.verdicts.itemsLabel', {
        defaultMessage: 'verdicts',
      })}
      searchableFields={['discovery_id', 'verdict', 'recommended_action', 'verdict_summary']}
      tableCaption={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.verdicts.tableCaption',
        { defaultMessage: 'Immutable audit trail of verdicts emitted by the multi-step pipeline.' }
      )}
      emptyMessage={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.verdicts.emptyMessage',
        { defaultMessage: 'No verdicts found in sigevents-verdicts-ms.' }
      )}
      errorTitle={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.verdicts.errorTitle', {
        defaultMessage: 'Failed to load verdicts',
      })}
    />
  );
}
