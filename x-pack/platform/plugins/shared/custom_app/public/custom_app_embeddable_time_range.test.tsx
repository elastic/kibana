/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { CustomAppByValueState } from '../server';
import { customAppEmbeddableFactory } from './custom_app_embeddable';

const runQuery = jest.fn(async () => ({
  columns: [{ name: 'value', type: 'long' }],
  rows: [[42]],
}));

jest.mock('./services', () => ({
  getServices: () => ({
    core: {
      http: {},
      application: { capabilities: {} },
      notifications: { toasts: {} },
      rendering: {},
    },
    search: jest.fn(),
    isEditorEnabled: true,
  }),
}));
jest.mock('./data/run_esql_query', () => ({ createRunEsqlQuery: () => runQuery }));
jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));
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
      data-test-subj="picker"
      onClick={() => onTimeChange({ start: 'now-7d', end: 'now' })}
    >
      {start}
    </button>
  ),
}));

const document = appDocumentSchema.parse({
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'time_range', id: 'when' },
      { type: 'stat', id: 'total', title: 'Total', query: 'ROW value = 42' },
    ],
  },
});

const build = async (dashboardRange = { from: 'now-15m', to: 'now' }) => {
  const parentApi = {
    viewMode$: new BehaviorSubject('edit'),
    timeRange$: new BehaviorSubject(dashboardRange),
    // What the dashboard says to the panel it holds.
    filters$: new BehaviorSubject(undefined),
    query$: new BehaviorSubject(undefined),
  };
  const { api, Component } = await customAppEmbeddableFactory.buildEmbeddable({
    initialState: { version: 1, document },
    // What a dashboard does to the api of a panel: it gives it its id, and the dashboard itself.
    finalizeApi: (registration: object) => ({ ...registration, uuid: 'panel-1', parentApi }),
    parentApi,
    uuid: 'panel-1',
  } as never);
  render(<Component />);
  // The first fetch is part of the panel being there; what follows is what is being tested.
  await screen.findByText('42');
  return api as unknown as { serializeState: () => CustomAppByValueState };
};

describe('the time range component in a panel of a dashboard', () => {
  beforeEach(() => runQuery.mockClear());

  it('shows the period the panel has, which is the dashboard’s until the panel has its own', async () => {
    const api = await build();

    // The dashboard's period, shown, and not copied into the panel.
    await waitFor(() => expect(screen.getByTestId('picker')).toHaveTextContent('now-15m'));
    expect(api.serializeState().time_range).toBeUndefined();
  });

  it('gives the panel a period of its own when it is changed, saved with the panel', async () => {
    const api = await build();

    await userEvent.click(await screen.findByTestId('picker'));

    await waitFor(() =>
      expect(api.serializeState().time_range).toEqual({ from: 'now-7d', to: 'now' })
    );
    // And the picker shows it from then on, in place of the dashboard's.
    await waitFor(() => expect(screen.getByTestId('picker')).toHaveTextContent('now-7d'));
  });

  it('runs the queries of the panel again for the period it was given', async () => {
    await build();
    const before = runQuery.mock.calls.length;

    await userEvent.click(await screen.findByTestId('picker'));

    await waitFor(() => expect(runQuery.mock.calls.length).toBeGreaterThan(before));
    const lastCall = runQuery.mock.calls.at(-1) as unknown as [
      string,
      { context: { timeRange: unknown } }
    ];
    expect(lastCall[1].context.timeRange).toEqual({ from: 'now-7d', to: 'now' });
  });
});
