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
import { RenderApp } from './render_app';

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
    render(<RenderApp document={document} />);

    expect(await screen.findByText('Orders')).toBeInTheDocument();
    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(runQuery.mock.calls[0][1].context.timeRange).toEqual({ from: 'now-24h', to: 'now' });
  });

  it('has its own time range, since no dashboard is around it', async () => {
    render(<RenderApp document={document} />);

    expect(await screen.findByTestId('superDatePickerToggleQuickMenuButton')).toBeInTheDocument();
  });
});
