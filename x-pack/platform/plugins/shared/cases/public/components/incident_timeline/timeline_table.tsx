/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { EuiBadge, EuiInMemoryTable, EuiText } from '@elastic/eui';
import type { IncidentTimelineAlert } from '../../../common/types/api';
import type { TimeFormat } from './format';
import { formatRange, formatTime, useTimeFormat } from './format';
import type { TimelineEntry, TimelineEvent } from './model';
import { ViewAlertAction } from './selection_bar';
import * as i18n from './translations';

export interface TimelineTableProps {
  events: TimelineEvent[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onMarkAsSignificant: (alert: IncidentTimelineAlert, ruleName: string) => void;
  onEditEntry: (entry: TimelineEntry) => void;
  onDeleteEntry: (entry: TimelineEntry) => void;
}

const EVENT_LABELS: Record<TimelineEvent['kind'], string> = {
  status: i18n.EVENT_STATUS,
  entry: i18n.EVENT_ENTRY,
  alert: i18n.EVENT_ALERT,
};

const TIME_SOURCE_LABELS: Record<IncidentTimelineAlert['timeSource'], string> = {
  original_time: i18n.TIME_SOURCE_EVENT,
  sequence_start: i18n.TIME_SOURCE_SEQUENCE_START,
  timestamp: i18n.TIME_SOURCE_WRITE,
};

const Details: React.FC<{ event: TimelineEvent; format: TimeFormat }> = ({ event, format }) => {
  if (event.kind === 'status') {
    const { marker } = event;
    return (
      <EuiText size="s">
        {i18n.MARKER_LABELS[marker.kind]} {i18n.BY_USER(marker.user)}
        {marker.source ? ` ${i18n.VIA_SOURCE(marker.source)}` : ''}
      </EuiText>
    );
  }
  if (event.kind === 'entry') {
    const { entry } = event;
    return (
      <EuiText size="s">
        <EuiBadge color="hollow">{i18n.CATEGORY_LABELS[entry.category]}</EuiBadge>{' '}
        <strong>{entry.data.title}</strong>
        {entry.endMs !== undefined && (
          <div>{formatRange(entry.occurredMs, entry.endMs, format)}</div>
        )}
        <div>{i18n.BY_USER(entry.createdBy)}</div>
      </EuiText>
    );
  }
  const { alert, ruleName } = event;
  return (
    <EuiText size="s">
      {ruleName}
      {alert.severity && <div>{`${i18n.SEVERITY}: ${alert.severity}`}</div>}
    </EuiText>
  );
};

const SEARCH: EuiSearchBarProps = {
  box: { incremental: true },
  filters: [
    {
      type: 'field_value_selection',
      field: 'kind',
      name: i18n.COLUMN_EVENT,
      multiSelect: 'or',
      options: (Object.keys(EVENT_LABELS) as Array<TimelineEvent['kind']>).map((kind) => ({
        value: kind,
        name: EVENT_LABELS[kind],
      })),
    },
  ],
};

type EntryEvent = Extract<TimelineEvent, { kind: 'entry' }>;
type AlertEvent = Extract<TimelineEvent, { kind: 'alert' }>;

/**
 * The EUI search box only matches top-level string fields, so each row carries the text of its
 * nested event flattened next to it.
 */
interface TimelineTableRow {
  readonly id: string;
  readonly kind: TimelineEvent['kind'];
  readonly atMs: number;
  readonly event: TimelineEvent;
  readonly time: string;
  readonly summary: string;
  readonly details: string;
  readonly hosts: string;
  readonly users: string;
}

const toRow = (event: TimelineEvent, format: TimeFormat): TimelineTableRow => {
  const base = {
    id: event.id,
    kind: event.kind,
    atMs: event.atMs,
    event,
    time: formatTime(event.atMs, format),
  };
  if (event.kind === 'status') {
    const { marker } = event;
    return {
      ...base,
      summary: i18n.MARKER_LABELS[marker.kind],
      details: marker.source ?? '',
      hosts: '',
      users: marker.user,
    };
  }
  if (event.kind === 'entry') {
    const { entry } = event;
    return {
      ...base,
      summary: entry.data.title,
      details: [i18n.CATEGORY_LABELS[entry.category], entry.data.content ?? ''].join(' '),
      hosts: '',
      users: entry.createdBy,
    };
  }
  const { alert, ruleName } = event;
  return {
    ...base,
    summary: ruleName,
    details: [alert.severity ?? '', TIME_SOURCE_LABELS[alert.timeSource]].join(' '),
    hosts: alert.hostNames.join(', '),
    users: alert.userNames.join(', '),
  };
};

const isEntry = ({ event }: TimelineTableRow): boolean => event.kind === 'entry';
const isAlert = ({ event }: TimelineTableRow): boolean => event.kind === 'alert';
const entryOf = ({ event }: TimelineTableRow): EntryEvent | undefined =>
  event.kind === 'entry' ? event : undefined;
const alertOf = ({ event }: TimelineTableRow): AlertEvent | undefined =>
  event.kind === 'alert' ? event : undefined;

/** Every event as a keyboard-operable table, the accessible alternative to the chart. */
export const TimelineTable: React.FC<TimelineTableProps> = ({
  events,
  canCreate,
  canUpdate,
  canDelete,
  onMarkAsSignificant,
  onEditEntry,
  onDeleteEntry,
}) => {
  const format = useTimeFormat();
  const rows = useMemo(() => events.map((event) => toRow(event, format)), [events, format]);

  const columns = useMemo<Array<EuiBasicTableColumn<TimelineTableRow>>>(
    () => [
      {
        field: 'atMs',
        name: i18n.COLUMN_TIME,
        width: '190px',
        sortable: true,
        render: (_atMs: number, { time }: TimelineTableRow) => time,
      },
      {
        field: 'kind',
        name: i18n.COLUMN_EVENT,
        width: '110px',
        render: (kind: TimelineEvent['kind']) => EVENT_LABELS[kind],
      },
      {
        name: i18n.COLUMN_DETAILS,
        render: (row: TimelineTableRow) => <Details event={row.event} format={format} />,
      },
      {
        name: i18n.COLUMN_TIME_SOURCE,
        width: '130px',
        render: (row: TimelineTableRow) => {
          const alertEvent = alertOf(row);
          return alertEvent ? TIME_SOURCE_LABELS[alertEvent.alert.timeSource] : null;
        },
      },
      {
        name: i18n.COLUMN_HOST,
        render: (row: TimelineTableRow) => (isAlert(row) ? row.hosts : null),
      },
      {
        name: i18n.COLUMN_USER,
        render: (row: TimelineTableRow) => (isAlert(row) ? row.users : null),
      },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '200px',
        actions: [
          {
            available: isAlert,
            render: (row: TimelineTableRow) => {
              const alertEvent = alertOf(row);
              return alertEvent ? (
                <ViewAlertAction alertId={alertEvent.alert.id} index={alertEvent.alert.index} />
              ) : (
                <></>
              );
            },
          },
          {
            type: 'button',
            name: i18n.MARK_AS_SIGNIFICANT,
            description: (row: TimelineTableRow) =>
              isAlert(row) ? i18n.MARK_AS_SIGNIFICANT_ARIA(row.summary, row.time) : '',
            available: (row: TimelineTableRow) => canCreate && isAlert(row),
            onClick: (row: TimelineTableRow) => {
              const alertEvent = alertOf(row);
              if (alertEvent) onMarkAsSignificant(alertEvent.alert, alertEvent.ruleName);
            },
            'data-test-subj': 'incident-timeline-table-mark-significant',
          },
          {
            type: 'icon',
            name: i18n.EDIT,
            description: (row: TimelineTableRow) =>
              isEntry(row) ? i18n.EDIT_ENTRY_ARIA(row.summary) : '',
            icon: 'pencil',
            available: (row: TimelineTableRow) => canUpdate && isEntry(row),
            onClick: (row: TimelineTableRow) => {
              const entryEvent = entryOf(row);
              if (entryEvent) onEditEntry(entryEvent.entry);
            },
            'data-test-subj': 'incident-timeline-table-entry-edit',
          },
          {
            type: 'icon',
            name: i18n.DELETE,
            description: (row: TimelineTableRow) =>
              isEntry(row) ? i18n.DELETE_ENTRY_ARIA(row.summary) : '',
            icon: 'trash',
            color: 'danger',
            available: (row: TimelineTableRow) => canDelete && isEntry(row),
            onClick: (row: TimelineTableRow) => {
              const entryEvent = entryOf(row);
              if (entryEvent) onDeleteEntry(entryEvent.entry);
            },
            'data-test-subj': 'incident-timeline-table-entry-delete',
          },
        ],
      },
    ],
    [format, canCreate, canUpdate, canDelete, onMarkAsSignificant, onEditEntry, onDeleteEntry]
  );

  return (
    <EuiInMemoryTable<TimelineTableRow>
      tableCaption={i18n.TABLE_CAPTION}
      items={rows}
      itemId="id"
      columns={columns}
      search={SEARCH}
      sorting={{ sort: { field: 'atMs', direction: 'asc' } }}
      pagination={{ initialPageSize: 25, pageSizeOptions: [25, 50, 100] }}
      rowProps={({ kind }) => ({ 'data-test-subj': `incident-timeline-table-row-${kind}` })}
      data-test-subj="incident-timeline-table"
    />
  );
};

Details.displayName = 'Details';
TimelineTable.displayName = 'TimelineTable';
