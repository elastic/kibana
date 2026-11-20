/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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

describe('the app, as it is seen', () => {
  beforeEach(() => runQuery.mockClear());

  const filtered = appDocumentSchema.parse({
    state: { greeting: { type: 'string', default: 'hello' } },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'heading', id: 'title', text: 'Say {{state.greeting}}' },
        {
          type: 'button',
          id: 'change',
          label: 'Change',
          onClick: [{ type: 'setState', key: 'greeting', value: 'bye' }],
        },
        {
          type: 'button',
          id: 'open',
          label: 'Open',
          onClick: [{ type: 'openFlyout', flyout: 'more' }],
        },
        { type: 'flyout', id: 'more', title: 'More', children: [] },
      ],
    },
  });

  it('starts as the view says, and asks for the data of the period of the view', async () => {
    const withData = appDocumentSchema.parse({
      state: { greeting: { type: 'string', default: 'hello' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'heading', id: 'title', text: 'Say {{state.greeting}}' },
          { type: 'stat', id: 'total', title: 'Total', query: 'ROW value = 42' },
        ],
      },
    });
    render(
      <LiveApp
        document={withData}
        view={{ values: { greeting: 'hi' }, timeRange: { from: 'now-7d', to: 'now' } }}
      />
    );

    expect(await screen.findByText('Say hi')).toBeInTheDocument();
    await screen.findByText('42');
    expect(runQuery.mock.calls[0][1].context.timeRange).toEqual({ from: 'now-7d', to: 'now' });
  });

  it('opens the flyout of the view', async () => {
    render(<LiveApp document={filtered} view={{ values: {}, flyout: 'more' }} />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('says nothing about an app that is as it starts, so a link is not made for nothing', async () => {
    const onViewChange = jest.fn();
    render(<LiveApp document={filtered} view={{ values: {} }} onViewChange={onViewChange} />);
    await screen.findByText('Say hello');

    expect(onViewChange).not.toHaveBeenCalled();
  });

  it('tells what changed, when something is done in the app', async () => {
    const onViewChange = jest.fn();
    render(<LiveApp document={filtered} view={{ values: {} }} onViewChange={onViewChange} />);
    await screen.findByText('Say hello');

    await userEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(onViewChange).toHaveBeenLastCalledWith({ values: { greeting: 'bye' } });

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(onViewChange).toHaveBeenLastCalledWith({ values: { greeting: 'bye' }, flyout: 'more' });
  });

  it('follows the view when it changes from outside, back to how it starts too', async () => {
    const { rerender } = render(<LiveApp document={filtered} view={{ values: {} }} />);
    await screen.findByText('Say hello');

    rerender(<LiveApp document={filtered} view={{ values: { greeting: 'yo' } }} />);
    expect(await screen.findByText('Say yo')).toBeInTheDocument();

    rerender(<LiveApp document={filtered} view={{ values: {} }} />);
    expect(await screen.findByText('Say hello')).toBeInTheDocument();
  });

  it('is not told about a change that came from outside, which it already has', async () => {
    const onViewChange = jest.fn();
    const { rerender } = render(
      <LiveApp document={filtered} view={{ values: {} }} onViewChange={onViewChange} />
    );
    await screen.findByText('Say hello');

    rerender(
      <LiveApp
        document={filtered}
        view={{ values: { greeting: 'yo' } }}
        onViewChange={onViewChange}
      />
    );
    await screen.findByText('Say yo');

    expect(onViewChange).not.toHaveBeenCalled();
  });

  it('keeps how it is seen when the document changes under it, such as a draft being applied', async () => {
    const view = { values: { greeting: 'yo' } };
    const { rerender } = render(<LiveApp document={filtered} view={view} />);
    await screen.findByText('Say yo');

    const changed = appDocumentSchema.parse({
      ...filtered,
      root: {
        ...filtered.root,
        children: [{ type: 'heading', id: 'title', text: 'Now {{state.greeting}}' }],
      },
    });
    rerender(<LiveApp document={changed} view={view} />);

    expect(await screen.findByText('Now yo')).toBeInTheDocument();
  });
});
