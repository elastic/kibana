/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from './test_utils';

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => ({
  columns: [{ name: 'n', type: 'long' }],
  rows: [[1]],
}));

const document = appDocumentSchema.parse({
  state: {
    show_errors: { type: 'boolean', default: false },
    note: { type: 'string', default: '' },
  },
  root: {
    type: 'stack',
    id: 'root',
    children: [
      {
        type: 'switch',
        id: 'flag',
        label: 'Show errors',
        bind: 'show_errors',
        onChange: [{ type: 'setState', key: 'note', value: 'changed' }],
      },
      { type: 'table', id: 'rows', query: 'FROM logs | WHERE ?show_errors | LIMIT 5' },
    ],
  },
});

describe('the switch node', () => {
  beforeEach(() => runQuery.mockClear());

  it('shows the value of its key, which is off to begin with', async () => {
    await renderApp(document, runQuery);

    // The ids EUI generates are all the same under Jest, so the switch has no name here.
    expect(screen.getByText('Show errors')).toBeInTheDocument();
    expect(screen.getByRole('switch')).not.toBeChecked();
  });

  it('sets its key to true and false, which a query uses as a parameter, and runs its actions', async () => {
    const { runtime } = await renderApp(document, runQuery);

    await userEvent.click(screen.getByRole('switch'));

    expect(screen.getByRole('switch')).toBeChecked();
    expect(runtime.state$.getValue()).toEqual({ show_errors: true, note: 'changed' });
    await waitFor(() =>
      expect(runQuery).toHaveBeenLastCalledWith(
        'FROM logs | WHERE ?show_errors | LIMIT 5',
        expect.objectContaining({ state: expect.objectContaining({ show_errors: true }) }),
        expect.anything()
      )
    );

    await userEvent.click(screen.getByRole('switch'));
    expect(runtime.state$.getValue().show_errors).toBe(false);
  });
});
