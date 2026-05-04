/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, type EuiBasicTableColumn, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DiscoveryKind } from '../../../../../../hooks/sig_events/use_discovery_records';
import type { SigEventRow } from '../types';
import {
  ACTION_COLOR,
  criticalityColor,
  RecordsTable,
  renderStreamBadges,
  renderTimestamp,
} from './common';

const VERDICT_COLOR: Record<string, string> = {
  promoted: 'danger',
  acknowledged: 'warning',
  demoted: 'default',
};

const IMPACT_COLOR: Record<string, string> = {
  critical: 'danger',
  high: 'warning',
  medium: 'primary',
  low: 'default',
};

interface Props {
  items: SigEventRow[];
  loading: boolean;
  error: Error | undefined;
  onRefresh: () => void;
  selectedItem: SigEventRow | null;
  onToggleSelected: (row: SigEventRow) => void;
  onDeleteRecords: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  onNavigateTo: (kind: DiscoveryKind, id: string) => void;
}

export function EventsTable({
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
  const columns = useMemo<Array<EuiBasicTableColumn<SigEventRow>>>(
    () => [
      {
        field: '@timestamp',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.timestampColumn', {
          defaultMessage: 'Timestamp',
        }),
        width: '180px',
        render: renderTimestamp,
      },
      {
        field: 'verdict',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.verdictColumn', {
          defaultMessage: 'Verdict',
        }),
        width: '110px',
        render: (v: string) => <EuiBadge color={VERDICT_COLOR[v] ?? 'hollow'}>{v}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.titleColumn', {
          defaultMessage: 'Title',
        }),
        truncateText: true,
        render: (row: SigEventRow) => (
          <EuiToolTip content={row.title}>
            <EuiLink
              data-test-subj="streamsDiscoveryEventsTitleLink"
              onClick={() => onToggleSelected(row)}
            >
              {row.title}
            </EuiLink>
          </EuiToolTip>
        ),
      },
      {
        field: 'stream_names',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.streamsColumn', {
          defaultMessage: 'Streams',
        }),
        width: '220px',
        render: renderStreamBadges,
      },
      {
        field: 'criticality',
        name: i18n.translate(
          'xpack.streams.sigEventsDiscovery.multiStep.events.criticalityColumn',
          { defaultMessage: 'Criticality' }
        ),
        width: '100px',
        align: 'right' as const,
        render: (v: number) => <EuiBadge color={criticalityColor(v)}>{v}</EuiBadge>,
      },
      {
        field: 'impact',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.impactColumn', {
          defaultMessage: 'Impact',
        }),
        width: '90px',
        render: (v?: string) =>
          v ? <EuiBadge color={IMPACT_COLOR[v] ?? 'default'}>{v}</EuiBadge> : '—',
      },
      {
        field: 'recommended_action',
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.actionColumn', {
          defaultMessage: 'Action',
        }),
        width: '120px',
        render: (v: string) => <EuiBadge color={ACTION_COLOR[v] ?? 'default'}>{v}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.discoveryColumn', {
          defaultMessage: 'Discovery',
        }),
        width: '200px',
        truncateText: true,
        render: (row: SigEventRow) =>
          row.discovery_id ? (
            <EuiToolTip
              content={i18n.translate(
                'xpack.streams.sigEventsDiscovery.multiStep.events.openDiscoveryTooltip',
                { defaultMessage: 'Open the matching discovery' }
              )}
            >
              <EuiLink
                data-test-subj="streamsDiscoveryEventsDiscoveryLink"
                onClick={() => onNavigateTo('discoveries', row.discovery_id!)}
              >
                <EuiText size="xs">
                  <code>{row.discovery_slug ?? row.discovery_id}</code>
                </EuiText>
              </EuiLink>
            </EuiToolTip>
          ) : (
            '—'
          ),
      },
      {
        name: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.verdictIdColumn', {
          defaultMessage: 'Verdict ID',
        }),
        width: '110px',
        truncateText: true,
        render: (row: SigEventRow) =>
          row.verdict_id ? (
            <EuiToolTip
              content={i18n.translate(
                'xpack.streams.sigEventsDiscovery.multiStep.events.openVerdictTooltip',
                { defaultMessage: 'Open the matching verdict' }
              )}
            >
              <EuiLink
                data-test-subj="streamsDiscoveryEventsVerdictLink"
                onClick={() => onNavigateTo('verdicts', row.verdict_id!)}
              >
                <EuiText size="xs">
                  <code>{row.verdict_id.slice(0, 8)}…</code>
                </EuiText>
              </EuiLink>
            </EuiToolTip>
          ) : (
            '—'
          ),
      },
    ],
    [onNavigateTo, onToggleSelected]
  );

  return (
    <RecordsTable<SigEventRow>
      items={items}
      columns={columns}
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      selectedItem={selectedItem}
      onToggleSelected={onToggleSelected}
      onDeleteRecords={onDeleteRecords}
      isDeleting={isDeleting}
      rowHeader="title"
      itemsLabel={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.itemsLabel', {
        defaultMessage: 'significant events',
      })}
      searchableFields={['title', 'verdict', 'recommended_action', 'impact', 'discovery_slug']}
      tableCaption={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.events.tableCaption',
        { defaultMessage: 'Significant events from the multi-step pipeline.' }
      )}
      emptyMessage={i18n.translate(
        'xpack.streams.sigEventsDiscovery.multiStep.events.emptyMessage',
        {
          defaultMessage:
            'No significant events in sigevents-events-ms — run the multi-step pipeline to produce data.',
        }
      )}
      errorTitle={i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.events.errorTitle', {
        defaultMessage: 'Failed to load significant events',
      })}
    />
  );
}
