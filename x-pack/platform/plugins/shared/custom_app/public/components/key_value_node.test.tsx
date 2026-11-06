/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { MAX_LIST_ROWS } from './key_value_node';
import { renderApp } from './test_utils';

const COLUMNS: SourceData['columns'] = [
  { name: 'service', type: 'keyword' },
  { name: 'errors', type: 'long' },
  { name: 'owner', type: 'keyword' },
  { name: 'notes', type: 'keyword' },
];

const ONE_ROW: SourceData = {
  columns: COLUMNS,
  rows: [['checkout', 12, 'payments-team', null]],
};

const TWO_ROWS: SourceData = {
  columns: COLUMNS,
  rows: [
    ['checkout', 12, 'payments-team', null],
    ['cart', 3, 'shop-team', 'new'],
  ],
};

const render = (keyValue: Record<string, unknown> = {}, result: SourceData = ONE_ROW) =>
  renderApp(
    appDocumentSchema.parse({
      root: { type: 'key_value', id: 'kv', query: 'ROW 1', ...keyValue },
    }),
    async () => result
  );

const labels = () => screen.getAllByRole('term').map((term) => term.textContent);
const values = () => screen.getAllByRole('definition').map((value) => value.textContent);

describe('KeyValueNode', () => {
  describe('one row', () => {
    it('shows every column of the row, as labels and values', async () => {
      await render();

      await screen.findByText('checkout');
      expect(labels()).toEqual(['service', 'errors', 'owner', 'notes']);
      expect(values()).toEqual(['checkout', '12', 'payments-team', '—']);
    });

    it('has no divider and says nothing about more rows', async () => {
      await render();

      await screen.findByText('checkout');
      expect(screen.queryByRole('separator')).not.toBeInTheDocument();
      expect(screen.queryByTestId('customAppKeyValueMoreRows')).not.toBeInTheDocument();
    });
  });

  describe('several rows', () => {
    it('shows every row, each as its own group of fields, in order', async () => {
      await render({}, TWO_ROWS);

      await screen.findByText('cart');
      expect(labels()).toEqual([
        'service',
        'errors',
        'owner',
        'notes',
        'service',
        'errors',
        'owner',
        'notes',
      ]);
      expect(values()).toEqual([
        'checkout',
        '12',
        'payments-team',
        '—',
        'cart',
        '3',
        'shop-team',
        'new',
      ]);
    });

    it('separates the rows with a divider, and no more than that', async () => {
      await render(
        {},
        { columns: COLUMNS, rows: [...TWO_ROWS.rows, ['search', 27, 'find-team', null]] }
      );

      await screen.findByText('search');
      expect(screen.getAllByRole('separator')).toHaveLength(2);
    });

    it('shows every row of a query grouped by something', async () => {
      const grouped: SourceData = {
        columns: [
          { name: 'COUNT()', type: 'long' },
          { name: 'clientip', type: 'ip' },
        ],
        rows: [
          [3, '204.70.91.103'],
          [2, '10.0.0.1'],
          [1, '10.0.0.2'],
        ],
      };
      await render({}, grouped);

      expect(await screen.findByText('204.70.91.103')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
      expect(screen.getByText('10.0.0.2')).toBeInTheDocument();
      expect(labels().filter((label) => label === 'clientip')).toHaveLength(3);
      expect(screen.queryByTestId('customAppKeyValueMoreRows')).not.toBeInTheDocument();
    });
  });

  describe('a very long result', () => {
    const rowsOf = (count: number): SourceData => ({
      columns: [{ name: 'n', type: 'long' }],
      rows: Array.from({ length: count }, (_unused, index) => [index]),
    });

    it(`shows up to ${MAX_LIST_ROWS} rows without comment`, async () => {
      await render({}, rowsOf(MAX_LIST_ROWS));

      await screen.findByText(String(MAX_LIST_ROWS - 1));
      expect(screen.getAllByRole('term')).toHaveLength(MAX_LIST_ROWS);
      expect(screen.queryByTestId('customAppKeyValueMoreRows')).not.toBeInTheDocument();
    });

    it('shows the first rows and says how many there were, beyond that', async () => {
      await render({}, rowsOf(MAX_LIST_ROWS + 5));

      expect(
        await screen.findByText(`Showing the first ${MAX_LIST_ROWS} of ${MAX_LIST_ROWS + 5} rows.`)
      ).toBeInTheDocument();
      expect(screen.getAllByRole('term')).toHaveLength(MAX_LIST_ROWS);
      expect(screen.queryByText(String(MAX_LIST_ROWS))).not.toBeInTheDocument();
    });
  });

  describe('fields', () => {
    it('shows only the chosen fields, in the chosen order, for every row', async () => {
      await render({ fields: ['owner', 'service'] }, TWO_ROWS);

      await screen.findByText('shop-team');
      expect(labels()).toEqual(['owner', 'service', 'owner', 'service']);
      expect(values()).toEqual(['payments-team', 'checkout', 'shop-team', 'cart']);
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
  });

  it('shows the empty state when the query returns no rows', async () => {
    await render({}, { columns: COLUMNS, rows: [] });

    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });
});
