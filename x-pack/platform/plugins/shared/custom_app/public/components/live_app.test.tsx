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
  getServices: () => ({ core: { http: {} }, search: jest.fn() }),
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

  it('has its own time range, since no dashboard is around it', async () => {
    render(<LiveApp document={document} />);

    expect(await screen.findByTestId('superDatePickerToggleQuickMenuButton')).toBeInTheDocument();
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
