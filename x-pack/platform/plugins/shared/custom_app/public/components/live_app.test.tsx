/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

const document = appDocumentSchema.parse({
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'heading', id: 'title', text: 'Orders' },
      { type: 'stat', id: 'total', title: 'Total', query: 'ROW value = 42' },
    ],
  },
});

describe('the app in the conversation', () => {
  beforeEach(() => runQuery.mockClear());

  it('shows the app with live data, for the last day unless the user picks otherwise', async () => {
    render(<LiveApp document={document} />);

    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(runQuery.mock.calls[0][1].context.timeRange).toEqual({ from: 'now-24h', to: 'now' });
  });

  it('has no time picker of its own: an app has one only if it has a time range in it', async () => {
    render(<LiveApp document={document} />);
    await screen.findByText('42');

    expect(screen.queryByTestId('superDatePickerToggleQuickMenuButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('customAppTimeRange')).not.toBeInTheDocument();
  });

  it('shows the time picker where the app has its time range, and the picker is usable', async () => {
    const withPicker = appDocumentSchema.parse({
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'time_range', id: 'when' },
          { type: 'stat', id: 'total', title: 'Total', query: 'ROW value = 42' },
        ],
      },
    });
    render(<LiveApp document={withPicker} />);

    expect(await screen.findByTestId('customAppTimeRange')).toBeInTheDocument();
    expect(await screen.findByTestId('superDatePickerToggleQuickMenuButton')).toBeEnabled();
  });

  it('shows the data of the new app when the app changes under it, not a table that never finishes', async () => {
    const before = appDocumentSchema.parse({
      root: { type: 'table', id: 'table', query: 'ROW value = 42' },
    });
    // What a draft looks like after a row click that remembers a column: a value, and an action.
    const after = appDocumentSchema.parse({
      state: { value: { type: 'string', default: '' } },
      root: {
        type: 'table',
        id: 'table',
        query: 'ROW value = 42',
        onRowClick: [{ type: 'setState', key: 'value', value: { fromColumn: 'value' } }],
      },
    });
    const { rerender } = render(<LiveApp document={before} />);
    expect(await screen.findByText('42')).toBeInTheDocument();

    rerender(<LiveApp document={after} />);

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the values of the new app too, since they come from a new runtime', async () => {
    const withGreeting = (greeting: string) =>
      appDocumentSchema.parse({
        state: { greeting: { type: 'string', default: greeting } },
        root: { type: 'heading', id: 'title', text: 'Say {{state.greeting}}' },
      });
    const { rerender } = render(<LiveApp document={withGreeting('hello')} />);
    expect(await screen.findByText('Say hello')).toBeInTheDocument();

    rerender(<LiveApp document={withGreeting('goodbye')} />);

    expect(await screen.findByText('Say goodbye')).toBeInTheDocument();
  });
});
