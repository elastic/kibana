/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { LiveApp } from './live_app';

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => ({
  columns: [{ name: 'value', type: 'long' }],
  rows: [[42]],
}));

jest.mock('../data/run_esql_query', () => ({ createRunEsqlQuery: () => runQuery }));
jest.mock('../services', () => ({
  getServices: () => ({
    core: {
      http: {},
      application: { capabilities: {} },
      notifications: { toasts: {} },
      rendering: {},
    },
    search: jest.fn(),
  }),
}));
// The picker's own menu is a popover that cannot be driven here; what matters is what the app does
// with the range it is told of, so it is a button that tells it of another one.
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiSuperDatePicker: ({
    start,
    onTimeChange,
  }: {
    start: string;
    onTimeChange: (range: { start: string; end: string }) => void;
  }) => (
    <button
      type="button"
      data-test-subj="pickRange"
      onClick={() => onTimeChange({ start: 'now-7d', end: 'now' })}
    >
      {start}
    </button>
  ),
}));

const make = (title: string) =>
  appDocumentSchema.parse({
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'time_range', id: 'when' },
        { type: 'stat', id: 'total', title, query: 'ROW value = 42' },
      ],
    },
  });

const lastRange = () => runQuery.mock.calls.at(-1)?.[1].context.timeRange;

describe('the time range of the app', () => {
  beforeEach(() => runQuery.mockClear());

  it('starts at the last day', async () => {
    render(<LiveApp document={make('First')} />);
    await screen.findByText('42');

    expect(lastRange()).toEqual({ from: 'now-24h', to: 'now' });
  });

  it('runs the queries again for the range that is picked', async () => {
    render(<LiveApp document={make('First')} />);
    await screen.findByText('42');

    await userEvent.click(await screen.findByTestId('pickRange'));

    await waitFor(() => expect(lastRange()).toEqual({ from: 'now-7d', to: 'now' }));
  });

  it('keeps the range the person picked when the app changes under it, as a draft does', async () => {
    const { rerender } = render(<LiveApp document={make('First')} />);
    await screen.findByText('42');
    await userEvent.click(await screen.findByTestId('pickRange'));
    await waitFor(() => expect(lastRange()).toEqual({ from: 'now-7d', to: 'now' }));

    rerender(<LiveApp document={make('Second')} />);

    await screen.findByText('Second');
    await waitFor(() => expect(lastRange()).toEqual({ from: 'now-7d', to: 'now' }));
  });
});
