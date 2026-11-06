/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { SourceData } from '../data/data_layer';
import { renderApp } from './test_utils';

/** A column is a name, or a name and the type the query says it holds. */
const data = (columns: Array<string | [string, string]>, rows: unknown[][]): SourceData => ({
  columns: columns.map((column) =>
    typeof column === 'string'
      ? { name: column, type: 'keyword' }
      : { name: column[0], type: column[1] }
  ),
  rows,
});

const SERVICES = data(
  ['service', ['errors', 'long']],
  [
    ['checkout', 12345],
    ['cart', 3],
    ['search', 27],
  ]
);

const documentWith = (table: Record<string, unknown> = {}, root: unknown = undefined) =>
  appDocumentSchema.parse({
    state: { service: { type: 'string', default: '' } },
    root: root ?? {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'table', id: 'table', query: 'ROW 1', ...table },
        { type: 'flyout', id: 'detail', title: 'Detail', children: [] },
      ],
    },
  });

const CLICK_ACTIONS = [
  { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
  { type: 'openFlyout', flyout: 'detail' },
];

const firstColumn = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const render = (table: Record<string, unknown>, result: SourceData = SERVICES) =>
  renderApp(documentWith(table), async () => result);

describe('TableNode', () => {
  it('shows every column of the result when none are configured', async () => {
    await render({});

    expect(await screen.findByText('checkout')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /service/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /errors/ })).toBeInTheDocument();
    expect(screen.getByText('12,345')).toBeInTheDocument();
  });

  it('applies configured headings', async () => {
    await render({
      columns: [
        { field: 'service', label: 'Service name' },
        { field: 'errors', label: 'Error count' },
      ],
    });

    expect(await screen.findByRole('columnheader', { name: /Service name/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Error count/ })).toBeInTheDocument();
  });

  describe('formatting follows the type the query says a column holds', () => {
    it('shows numbers with separators, and other text as it is', async () => {
      await render({});

      expect(await screen.findByText('12,345')).toBeInTheDocument();
      expect(screen.getByText('checkout')).toBeInTheDocument();
    });

    it('shows a number-like text column as the text it is', async () => {
      await render({}, data(['code'], [['00042']]));

      expect(await screen.findByText('00042')).toBeInTheDocument();
    });

    it('shows a date column as a date', async () => {
      await render({}, data([['seen', 'date']], [['2026-10-12T08:30:00.000Z']]));

      const cell = await screen.findByText(/2026/);
      expect(cell.textContent).not.toBe('2026-10-12T08:30:00.000Z');
    });

    it.each(['integer', 'double', 'unsigned_long', 'float'])(
      'treats %s as a number',
      async (type) => {
        await render({}, data([['n', type]], [[1234]]));

        expect(await screen.findByText('1,234')).toBeInTheDocument();
      }
    );
  });

  it('can show a subset of the columns', async () => {
    await render({ columns: [{ field: 'service' }] });

    await screen.findByText('checkout');
    expect(screen.queryByRole('columnheader', { name: /errors/ })).not.toBeInTheDocument();
  });

  it('names the table for screen readers', async () => {
    await render({ caption: 'Services and their errors' });

    // EUI adds the row and page counts to the name, and fills it in after a short delay.
    expect(
      await screen.findByRole('table', { name: /^Services and their errors/ })
    ).toBeInTheDocument();
  });

  it('sorts a column in both directions, numbers by magnitude', async () => {
    await render({ columns: [{ field: 'service' }, { field: 'errors' }] });
    await screen.findByText('checkout');

    await userEvent.click(screen.getByRole('button', { name: /errors/ }));
    expect(firstColumn()).toEqual(['cart', 'search', 'checkout']);

    await userEvent.click(screen.getByRole('button', { name: /errors/ }));
    expect(firstColumn()).toEqual(['checkout', 'search', 'cart']);
  });

  it('pages through the rows ten at a time', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => [`svc-${index}`, index]);
    await render({}, data(['service', 'errors'], rows));
    await screen.findByText('svc-0');

    expect(firstColumn()).toHaveLength(10);

    await userEvent.click(screen.getByTestId('pagination-button-next'));
    expect(firstColumn()).toEqual(['svc-10', 'svc-11']);
  });

  it('shows the empty state when the query returns no rows', async () => {
    await render({}, data(['service'], []));
    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });

  it('says so when a configured column is not in the results', async () => {
    await render({ columns: [{ field: 'service' }, { field: 'owner' }, { field: 'region' }] });

    expect(
      await screen.findByText('The query has no columns named "owner", "region"')
    ).toBeInTheDocument();
  });

  describe('row click', () => {
    it('runs the actions with the clicked row', async () => {
      const { runtime } = await render({ onRowClick: CLICK_ACTIONS });

      await userEvent.click(await screen.findByText('search'));

      expect(runtime.state$.getValue().service).toBe('search');
      expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    });

    it('runs them once when the first-cell link is used, not twice', async () => {
      const { runtime } = await render({ onRowClick: CLICK_ACTIONS });
      const emissions: unknown[] = [];
      runtime.state$.subscribe((value) => emissions.push(value));

      await userEvent.click(await screen.findByRole('button', { name: 'cart' }));

      expect(emissions).toHaveLength(2);
      expect(runtime.state$.getValue().service).toBe('cart');
    });

    it('can be done from the keyboard', async () => {
      const { runtime } = await render({ onRowClick: CLICK_ACTIONS });

      (await screen.findByRole('button', { name: 'cart' })).focus();
      await userEvent.keyboard('{Enter}');

      expect(runtime.state$.getValue().service).toBe('cart');
      expect(runtime.openFlyoutId$.getValue()).toBe('detail');
    });

    it('offers no controls when the table has no actions', async () => {
      await render({});

      await screen.findByText('checkout');
      expect(screen.queryByRole('button', { name: 'checkout' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('customAppTableRow')).not.toBeInTheDocument();
    });

    it('warns about what could not be applied, and lets the warning be dismissed', async () => {
      const { runtime } = await render(
        { onRowClick: CLICK_ACTIONS },
        data(['service', 'errors'], [[null, 1]])
      );

      await userEvent.click(await screen.findByTestId('customAppTableRow'));

      expect(
        await screen.findByText('Part of that selection could not be applied')
      ).toBeInTheDocument();
      expect(screen.getByText('"service" expects a string but got null')).toBeInTheDocument();
      expect(runtime.state$.getValue().service).toBe('');

      await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
      expect(
        screen.queryByText('Part of that selection could not be applied')
      ).not.toBeInTheDocument();
    });

    it('clears an earlier warning once a selection applies cleanly', async () => {
      await render(
        { onRowClick: CLICK_ACTIONS },
        data(
          ['service', 'errors'],
          [
            [null, 1],
            ['cart', 2],
          ]
        )
      );
      const rows = await screen.findAllByTestId('customAppTableRow');

      await userEvent.click(rows[0]);
      expect(
        await screen.findByText('Part of that selection could not be applied')
      ).toBeInTheDocument();

      await userEvent.click(rows[1]);
      expect(
        screen.queryByText('Part of that selection could not be applied')
      ).not.toBeInTheDocument();
    });
  });
});
