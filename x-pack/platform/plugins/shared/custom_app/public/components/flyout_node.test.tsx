/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery, SourceData } from '../data/data_layer';
import { renderApp } from './test_utils';

const DETAIL: SourceData = {
  columns: [{ name: 'owner', type: 'keyword' }],
  rows: [['payments-team']],
};

const document = appDocumentSchema.parse({
  state: { service: { type: 'string', default: 'checkout' } },
  root: {
    type: 'stack',
    id: 'root',
    children: [
      { type: 'text', id: 'before', text: 'before' },
      {
        type: 'flyout',
        id: 'service-flyout',
        title: 'Service {{state.service}}',
        children: [
          { type: 'text', id: 'inside', text: 'inside the flyout' },
          { type: 'key_value', id: 'kv', query: 'FROM x | WHERE s == ?service' },
        ],
      },
      { type: 'text', id: 'after', text: 'after' },
    ],
  },
});

const setup = () => {
  const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => DETAIL);
  return { runQuery, ready: renderApp(document, runQuery) };
};

const open = (runtime: { run: (actions: never[]) => unknown }) =>
  act(() => {
    runtime.run([{ type: 'openFlyout', flyout: 'service-flyout' }] as never[]);
  });

describe('FlyoutNode', () => {
  it('draws nothing while closed, and does not run the queries of its content', async () => {
    const { runQuery, ready } = setup();
    await ready;

    expect(screen.getByText('before')).toBeInTheDocument();
    expect(screen.queryByText('inside the flyout')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('opens with its interpolated title and content, and then runs its queries', async () => {
    const { runQuery, ready } = setup();
    const { runtime } = await ready;

    open(runtime);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Service checkout' })).toBeInTheDocument();
    expect(screen.getByText('inside the flyout')).toBeInTheDocument();
    expect(await screen.findByText('payments-team')).toBeInTheDocument();
    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery.mock.calls[0][1].state).toEqual({ service: 'checkout' });
  });

  it('closes from its close button', async () => {
    const { runQuery, ready } = setup();
    const { runtime } = await ready;
    open(runtime);
    await screen.findByText('payments-team');

    await userEvent.click(screen.getByTestId('euiFlyoutCloseButton'));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(runtime.openFlyoutId$.getValue()).toBeUndefined();
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('runs its queries again, afresh, each time it opens', async () => {
    const { runQuery, ready } = setup();
    const { runtime } = await ready;

    open(runtime);
    await screen.findByText('payments-team');
    act(() => {
      runtime.run([{ type: 'closeFlyout' }]);
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    open(runtime);
    await screen.findByText('payments-team');

    expect(runQuery).toHaveBeenCalledTimes(2);
  });

  it('keeps its title in step with the state while open', async () => {
    const { ready } = setup();
    const { runtime } = await ready;
    open(runtime);
    await screen.findByRole('heading', { name: 'Service checkout' });

    act(() => {
      runtime.run([{ type: 'setState', key: 'service', value: 'cart' }]);
    });

    expect(await screen.findByRole('heading', { name: 'Service cart' })).toBeInTheDocument();
  });
});
