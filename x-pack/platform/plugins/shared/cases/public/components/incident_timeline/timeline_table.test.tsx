/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../common/mock';
import type { IncidentTimelineAlert } from '../../../common/types/api';
import type { TimelineEntry } from './model';
import { buildTimelineEvents } from './model';
import { TimelineTable } from './timeline_table';

const T0 = Date.parse('2026-09-01T09:00:00.000Z');
const MINUTE = 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const credentialAlert: IncidentTimelineAlert = {
  id: 'cred',
  index: '.alerts-security.alerts-default',
  time: iso(T0 + 10 * MINUTE),
  timeSource: 'timestamp',
  timestamp: iso(T0 + 10 * MINUTE),
  ruleId: 'cred-rule',
  ruleName: 'Access of Stored Browser Credentials',
  hostNames: ['mac-01'],
  userNames: ['jdoe'],
};

const entry: TimelineEntry = {
  id: 'pasted',
  version: 'v1',
  category: 'actor',
  occurredMs: T0 + 5 * MINUTE,
  createdBy: 'analyst',
  data: { title: 'User pasted ClickFix command', occurredAt: iso(T0 + 5 * MINUTE) },
};

const events = buildTimelineEvents({
  markers: [{ kind: 'created', atMs: T0, user: 'analyst' }],
  entries: [entry],
  alerts: [credentialAlert],
});

const renderTable = (permissions: {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) => {
  const handlers = {
    onMarkAsSignificant: jest.fn(),
    onEditEntry: jest.fn(),
    onDeleteEntry: jest.fn(),
  };
  renderWithTestingProviders(<TimelineTable events={events} {...permissions} {...handlers} />);
  return handlers;
};

describe('TimelineTable', () => {
  it('lists status changes, entries and alerts oldest first with alert details', () => {
    renderTable({ canCreate: true, canUpdate: true, canDelete: true });

    const rows = screen.getAllByTestId(/^incident-timeline-table-row-/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'incident-timeline-table-row-status',
      'incident-timeline-table-row-entry',
      'incident-timeline-table-row-alert',
    ]);
    const alertRow = within(rows[2]);
    expect(alertRow.getByText('Access of Stored Browser Credentials')).toBeInTheDocument();
    expect(alertRow.getByText('Alert write time')).toBeInTheDocument();
    expect(alertRow.getByText('mac-01')).toBeInTheDocument();
    expect(alertRow.getByText('jdoe')).toBeInTheDocument();
  });

  it('runs the row actions from the keyboard', async () => {
    const { onMarkAsSignificant, onEditEntry, onDeleteEntry } = renderTable({
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    });

    act(() => screen.getByTestId('incident-timeline-table-mark-significant').focus());
    await userEvent.keyboard('{Enter}');
    expect(onMarkAsSignificant).toHaveBeenCalledWith(
      credentialAlert,
      'Access of Stored Browser Credentials'
    );

    act(() => screen.getByTestId('incident-timeline-table-entry-edit').focus());
    await userEvent.keyboard('{Enter}');
    expect(onEditEntry).toHaveBeenCalledWith(entry);

    await userEvent.tab();
    expect(screen.getByTestId('incident-timeline-table-entry-delete')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onDeleteEntry).toHaveBeenCalledWith(entry);
  });

  it('filters the rows by event kind', async () => {
    renderTable({ canCreate: true, canUpdate: true, canDelete: true });

    await userEvent.type(screen.getByRole('searchbox'), 'kind:alert');

    const rows = screen.getAllByTestId(/^incident-timeline-table-row-/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([
      'incident-timeline-table-row-alert',
    ]);
  });

  it.each([
    ['an entry title', 'clickfix', 'incident-timeline-table-row-entry'],
    ['a rule name', 'browser credentials', 'incident-timeline-table-row-alert'],
    ['a host', 'mac-01', 'incident-timeline-table-row-alert'],
    ['a status change', 'created', 'incident-timeline-table-row-status'],
  ])('finds the event by %s in free-text search', async (_name, text, testSubj) => {
    renderTable({ canCreate: true, canUpdate: true, canDelete: true });

    await userEvent.type(screen.getByRole('searchbox'), text);

    const rows = screen.getAllByTestId(/^incident-timeline-table-row-/);
    expect(rows.map((row) => row.getAttribute('data-test-subj'))).toEqual([testSubj]);
  });

  it('hides actions the user lacks permission for', () => {
    renderTable({ canCreate: false, canUpdate: false, canDelete: false });

    expect(
      screen.queryByTestId('incident-timeline-table-mark-significant')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-table-entry-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('incident-timeline-table-entry-delete')).not.toBeInTheDocument();
  });
});
