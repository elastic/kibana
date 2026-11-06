/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from './test_utils';

const answers: Record<string, ReturnType<RunQuery>> = {
  'ROW now = 120, before = 100': Promise.resolve({
    columns: [
      { name: 'now', type: 'long' },
      { name: 'before', type: 'long' },
    ],
    rows: [[120, 100]],
  }),
  'ROW now = 8, before = 10': Promise.resolve({
    columns: [
      { name: 'now', type: 'long' },
      { name: 'before', type: 'long' },
    ],
    rows: [[8, 10]],
  }),
  'ROW used = 40': Promise.resolve({ columns: [{ name: 'used', type: 'long' }], rows: [[40]] }),
  'ROW used = "many"': Promise.resolve({
    columns: [{ name: 'used', type: 'keyword' }],
    rows: [['many']],
  }),
};
const runQuery: RunQuery = (query) => answers[query];

const show = (children: unknown[], state: Record<string, unknown> = {}) =>
  renderApp(
    appDocumentSchema.parse({ state, root: { type: 'stack', id: 'root', children } }),
    runQuery
  );

describe('a card', () => {
  it('shows its title and description, and what it holds', async () => {
    await show(
      [
        {
          type: 'card',
          id: 'c',
          title: 'Hello {{state.who}}',
          description: 'About it',
          icon: 'check',
          children: [{ type: 'heading', id: 'h', text: 'Inside' }],
        },
      ],
      { who: { type: 'string', default: 'Ana' } }
    );

    expect(screen.getByRole('heading', { name: 'Hello Ana' })).toBeInTheDocument();
    expect(screen.getByText('About it')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Inside' })).toBeInTheDocument();
  });
});

describe('columns', () => {
  it('show what they hold, each in its own place', async () => {
    await show([
      {
        type: 'columns',
        id: 'cols',
        columns: 3,
        children: [
          { type: 'heading', id: 'a', text: 'First' },
          { type: 'heading', id: 'b', text: 'Second' },
        ],
      },
    ]);

    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  });
});

describe('a badge', () => {
  it('says its text, with the values of the app in it', async () => {
    await show([{ type: 'badge', id: 'b', text: 'Status: {{state.s}}', color: 'warning' }], {
      s: { type: 'string', default: 'open' },
    });

    expect(screen.getByText('Status: open')).toBeInTheDocument();
  });
});

describe('tabs', () => {
  it('show one section at a time, and change when another is chosen', async () => {
    await show([
      {
        type: 'tabs',
        id: 't',
        children: [
          {
            type: 'section',
            id: 's1',
            label: 'Overview',
            children: [{ type: 'heading', id: 'h1', text: 'In overview' }],
          },
          {
            type: 'section',
            id: 's2',
            label: 'Details',
            children: [{ type: 'heading', id: 'h2', text: 'In details' }],
          },
        ],
      },
    ]);

    expect(screen.getByRole('heading', { name: 'In overview' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'In details' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Details' }));

    expect(screen.getByRole('heading', { name: 'In details' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'In overview' })).not.toBeInTheDocument();
  });
});

describe('an accordion', () => {
  it('has its sections closed unless they ask to be open, and opens one when pressed', async () => {
    await show([
      {
        type: 'accordion',
        id: 'a',
        children: [
          {
            type: 'section',
            id: 's1',
            label: 'Open one',
            open: true,
            children: [{ type: 'heading', id: 'h1', text: 'Seen' }],
          },
          {
            type: 'section',
            id: 's2',
            label: 'Closed one',
            children: [{ type: 'heading', id: 'h2', text: 'Hidden' }],
          },
        ],
      },
    ]);

    expect(screen.getByRole('button', { name: 'Open one' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Closed one' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Closed one' }));

    expect(screen.getByRole('button', { name: 'Closed one' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });
});

describe('a metric', () => {
  const metric = (query: string, betterWhen?: string) => ({
    type: 'metric',
    id: 'm',
    title: 'Errors',
    query,
    compare: 'before',
    ...(betterWhen ? { betterWhen } : {}),
  });

  it('shows the number, and how much it changed from the one before it', async () => {
    await show([metric('ROW now = 120, before = 100')]);

    const stat = await screen.findByTestId('customAppMetric');
    expect(within(stat).getByText('120')).toBeInTheDocument();
    expect(screen.getByTestId('customAppMetricChange')).toHaveTextContent('+20%');
  });

  it('says a fall is for the better when lower is better, and not otherwise', async () => {
    const { unmount } = await show([metric('ROW now = 8, before = 10', 'lower')]);
    expect(await screen.findByTestId('customAppMetricChange')).toHaveTextContent('-20%');
    unmount();

    await show([metric('ROW now = 8, before = 10')]);
    expect(await screen.findByTestId('customAppMetricChange')).toHaveTextContent('-20%');
  });

  it('shows no change when it has nothing to compare with', async () => {
    await show([
      { type: 'metric', id: 'm', title: 'Errors', query: 'ROW now = 120, before = 100' },
    ]);

    await screen.findByTestId('customAppMetric');
    expect(screen.queryByTestId('customAppMetricChange')).not.toBeInTheDocument();
  });
});

describe('a progress bar', () => {
  it('is filled as far as the number is of its largest, and says so', async () => {
    await show([{ type: 'progress', id: 'p', label: 'Disk', query: 'ROW used = 40', max: 200 }]);

    const bar = await screen.findByTestId('customAppProgress');
    expect(bar).toHaveAttribute('value', '40');
    expect(bar).toHaveAttribute('max', '200');
    expect(screen.getByText('Disk')).toBeInTheDocument();
    expect(screen.getByText('40 / 200')).toBeInTheDocument();
  });

  it('says so when what it was given is not a number', async () => {
    await show([{ type: 'progress', id: 'p', query: 'ROW used = "many"' }]);

    expect(
      await screen.findByText('The first column of the first row is not a number.')
    ).toBeInTheDocument();
  });
});
