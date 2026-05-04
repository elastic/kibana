/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  type DiscoveryKind,
  useDiscoveryRecords,
} from '../../../../../hooks/sig_events/use_discovery_records';
import { useDiscoveryRecordsBulkDelete } from '../../../../../hooks/sig_events/use_discovery_records_bulk_delete';
import { RecordFlyout } from './record_flyout';
import { DetectionsTable } from './tables/detections_table';
import { DiscoveriesTable } from './tables/discoveries_table';
import { EventsTable } from './tables/events_table';
import { VerdictsTable } from './tables/verdicts_table';
import type { BaseRecord, DetectionRow, DiscoveryItemRow, SigEventRow, VerdictRow } from './types';

type SelectedRecord = BaseRecord & Record<string, unknown>;

const SUB_TABS: ReadonlyArray<{
  id: DiscoveryKind;
  label: string;
}> = [
  {
    id: 'events',
    label: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.tab.events', {
      defaultMessage: 'Significant Events',
    }),
  },
  {
    id: 'detections',
    label: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.tab.detections', {
      defaultMessage: 'Detections',
    }),
  },
  {
    id: 'discoveries',
    label: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.tab.discoveries', {
      defaultMessage: 'Discoveries',
    }),
  },
  {
    id: 'verdicts',
    label: i18n.translate('xpack.streams.sigEventsDiscovery.multiStep.tab.verdicts', {
      defaultMessage: 'Verdicts',
    }),
  },
];

function toRows<TRow extends BaseRecord>(
  records: Array<{ _id: string; _index: string; _source: unknown }> | undefined
): TRow[] {
  if (!records) return [];
  return records.map(
    (r) =>
      ({
        _id: r._id,
        _index: r._index,
        ...((r._source as object | null) ?? {}),
      } as TRow)
  );
}

export function MultiStepDashboard() {
  const [activeTab, setActiveTab] = useState<DiscoveryKind>('events');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedByTab, setSelectedByTab] = useState<
    Partial<Record<DiscoveryKind, SelectedRecord>>
  >({});
  // When the user clicks a cross-tab id link (e.g. discovery_id from a
  // verdict, detection_id from a discovery), we switch tabs and remember the
  // id we want to open. Once that tab's fetch resolves, we map the id to a
  // row and place it in selectedByTab.<kind>.
  const [pendingByKind, setPendingByKind] = useState<Partial<Record<DiscoveryKind, string>>>({});

  const fetchState = useDiscoveryRecords(activeTab, refreshKey);

  const onRefresh = useCallback(() => setRefreshKey((n) => n + 1), []);

  const { deleteRecordsInBulk, isDeleting } = useDiscoveryRecordsBulkDelete({
    kind: activeTab,
    onSuccess: onRefresh,
  });

  const onToggleSelected = useCallback(
    <TRow extends BaseRecord>(row: TRow) => {
      setSelectedByTab((prev) => {
        const current = prev[activeTab];
        const isSame = current?._id === row._id;
        return {
          ...prev,
          [activeTab]: isSame
            ? undefined
            : ({
                ...(row as unknown as Record<string, unknown>),
                _id: row._id,
                _index: row._index,
              } as SelectedRecord),
        };
      });
    },
    [activeTab]
  );

  const onCloseFlyout = useCallback(() => {
    setSelectedByTab((prev) => ({ ...prev, [activeTab]: undefined }));
  }, [activeTab]);

  const onTabClick = useCallback((id: DiscoveryKind) => {
    setActiveTab(id);
  }, []);

  /**
   * Cross-tab navigation. The `id` is interpreted per-kind:
   * - `events` / `detections` / `verdicts`: the document `_id` (matches
   *   `event_id` / `detection_id` / `verdict_id` respectively).
   * - `discoveries`: the `discovery_id` slug (the document `_id` is an
   *   opaque ES auto-id we don't expose).
   */
  const onNavigateTo = useCallback((kind: DiscoveryKind, id: string) => {
    setActiveTab(kind);
    setPendingByKind((prev) => ({ ...prev, [kind]: id }));
  }, []);

  const onDeleteRecords = useCallback(
    async (ids: string[]) => {
      const current = selectedByTab[activeTab];
      await deleteRecordsInBulk(ids);
      if (current && ids.includes(current._id)) {
        setSelectedByTab((prev) => ({ ...prev, [activeTab]: undefined }));
      }
    },
    [activeTab, deleteRecordsInBulk, selectedByTab]
  );

  const items = useMemo(() => {
    switch (activeTab) {
      case 'events':
        return toRows<SigEventRow>(fetchState.value?.records);
      case 'detections':
        return toRows<DetectionRow>(fetchState.value?.records);
      case 'discoveries':
        return toRows<DiscoveryItemRow>(fetchState.value?.records);
      case 'verdicts':
        return toRows<VerdictRow>(fetchState.value?.records);
    }
  }, [activeTab, fetchState.value]);

  // Resolve a pending cross-tab navigation as soon as the matching tab's
  // data loads.
  useEffect(() => {
    const pendingId = pendingByKind[activeTab];
    if (!pendingId || fetchState.loading) return;
    const match = items.find((row) => {
      if (activeTab === 'discoveries') {
        return (row as DiscoveryItemRow).discovery_id === pendingId;
      }
      return row._id === pendingId;
    });
    if (match) {
      setSelectedByTab((prev) => ({
        ...prev,
        [activeTab]: {
          ...(match as unknown as Record<string, unknown>),
          _id: match._id,
          _index: match._index,
        } as SelectedRecord,
      }));
    }
    setPendingByKind((prev) => {
      const { [activeTab]: _omit, ...rest } = prev;
      return rest;
    });
  }, [activeTab, fetchState.loading, items, pendingByKind]);

  // Prune the per-tab selected record if it no longer exists in the data
  // (e.g. after a successful refresh post-delete).
  useEffect(() => {
    const current = selectedByTab[activeTab];
    if (!current) return;
    if (!items.some((i) => i._id === current._id)) {
      setSelectedByTab((prev) => ({ ...prev, [activeTab]: undefined }));
    }
  }, [activeTab, items, selectedByTab]);

  const loading = fetchState.loading;
  const error = fetchState.error;
  const selected = selectedByTab[activeTab] ?? null;

  return (
    <>
      <EuiTabs>
        {SUB_TABS.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={activeTab === tab.id}
            onClick={() => onTabClick(tab.id)}
            data-test-subj={`streamsDiscoveryMultiStepTab-${tab.id}`}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {activeTab === 'events' && (
        <EventsTable
          items={items as SigEventRow[]}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          selectedItem={(selected as unknown as SigEventRow) ?? null}
          onToggleSelected={onToggleSelected}
          onDeleteRecords={onDeleteRecords}
          isDeleting={isDeleting}
          onNavigateTo={onNavigateTo}
        />
      )}
      {activeTab === 'detections' && (
        <DetectionsTable
          items={items as DetectionRow[]}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          selectedItem={(selected as unknown as DetectionRow) ?? null}
          onToggleSelected={onToggleSelected}
          onDeleteRecords={onDeleteRecords}
          isDeleting={isDeleting}
        />
      )}
      {activeTab === 'discoveries' && (
        <DiscoveriesTable
          items={items as DiscoveryItemRow[]}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          selectedItem={(selected as unknown as DiscoveryItemRow) ?? null}
          onToggleSelected={onToggleSelected}
          onDeleteRecords={onDeleteRecords}
          isDeleting={isDeleting}
        />
      )}
      {activeTab === 'verdicts' && (
        <VerdictsTable
          items={items as VerdictRow[]}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          selectedItem={(selected as unknown as VerdictRow) ?? null}
          onToggleSelected={onToggleSelected}
          onDeleteRecords={onDeleteRecords}
          isDeleting={isDeleting}
          onNavigateTo={onNavigateTo}
        />
      )}
      {selected && (
        <RecordFlyout
          kind={activeTab}
          record={selected}
          onClose={onCloseFlyout}
          onNavigateTo={onNavigateTo}
        />
      )}
    </>
  );
}
