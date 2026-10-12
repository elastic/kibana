/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { renderApp } from './test_utils';

const DETAIL: SourceData = {
  columns: [
    { name: 'service', type: 'keyword' },
    { name: 'errors', type: 'long' },
    { name: 'owner', type: 'keyword' },
    { name: 'notes', type: 'keyword' },
  ],
  rows: [
    ['checkout', 12, 'payments-team', null],
    ['ignored', 99, 'ignored-team', 'ignored'],
  ],
};

const render = (keyValue: Record<string, unknown> = {}, result: SourceData = DETAIL) =>
  renderApp(
    appDocumentSchema.parse({
      dataSources: { detail: { type: 'esql', query: 'ROW 1' } },
      root: { type: 'key_value', id: 'kv', source: 'detail', ...keyValue },
    }),
    async () => result
  );

const labels = () => screen.getAllByRole('term').map((term) => term.textContent);
const values = () => screen.getAllByRole('definition').map((value) => value.textContent);

describe('KeyValueNode', () => {
  it('shows every column of the first row, and only the first row', async () => {
    await render();

    await screen.findByText('checkout');
    expect(labels()).toEqual(['service', 'errors', 'owner', 'notes']);
    expect(values()).toEqual(['checkout', '12', 'payments-team', '—']);
    expect(screen.queryByText('ignored')).not.toBeInTheDocument();
  });

  it('shows only the chosen fields, in the chosen order', async () => {
    await render({ fields: ['owner', 'service'] });

    await screen.findByText('payments-team');
    expect(labels()).toEqual(['owner', 'service']);
    expect(values()).toEqual(['payments-team', 'checkout']);
  });

  it('shows a dash for an empty value', async () => {
    await render({ fields: ['notes'] });

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('says so when a chosen field is not in the results', async () => {
    await render({ fields: ['service', 'region'] });

    expect(await screen.findByText('The query has no column named "region"')).toBeInTheDocument();
    expect(screen.queryByText('checkout')).not.toBeInTheDocument();
  });

  it('shows the empty state when the query returns no rows', async () => {
    await render({}, { columns: DETAIL.columns, rows: [] });

    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });
});
