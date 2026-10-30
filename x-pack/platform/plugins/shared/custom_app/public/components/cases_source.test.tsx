/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { RunCases, RunQuery } from '../data/data_layer';
import { renderApp } from './test_utils';

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => {
  throw new Error('No query is expected');
});

const CASES = [
  ['case-1', 'Suspicious login', 'open', 'high'],
  ['case-2', 'Slow checkout', 'closed', 'low'],
] as const;

const runCases = jest.fn<ReturnType<RunCases>, Parameters<RunCases>>(async (source, { state }) => {
  if (source.count) {
    return { columns: [{ name: 'cases', type: 'integer' }], rows: [[128]] };
  }
  const status = typeof source.status === 'object' ? state[source.status.fromState] : source.status;
  const shown = CASES.filter(([, , caseStatus]) => !status || caseStatus === status);
  return {
    columns: [
      { name: 'id', type: 'keyword' },
      { name: 'title', type: 'keyword' },
      { name: 'status', type: 'keyword' },
      { name: 'severity', type: 'keyword' },
    ],
    rows: shown.map((row) => [...row]),
  };
});

describe('components that show cases', () => {
  beforeEach(() => {
    runQuery.mockClear();
    runCases.mockClear();
  });

  it('shows the cases in a table, as it shows the rows of a query, and runs no query', async () => {
    const document = appDocumentSchema.parse({
      root: { type: 'table', id: 'cases', source: { type: 'cases' } },
    });
    await renderApp(document, runQuery, runCases);

    expect(await screen.findByText('Suspicious login')).toBeInTheDocument();
    expect(screen.getByText('Slow checkout')).toBeInTheDocument();
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('shows how many cases there are in a stat that counts', async () => {
    const document = appDocumentSchema.parse({
      root: {
        type: 'stat',
        id: 'total',
        title: 'Open cases',
        source: { type: 'cases', status: 'open', count: true },
      },
    });
    await renderApp(document, runQuery, runCases);

    expect(await screen.findByText('128')).toBeInTheDocument();
    expect(screen.getByText('Open cases')).toBeInTheDocument();
  });

  it('shows the details of the first case in a list of fields', async () => {
    const document = appDocumentSchema.parse({
      root: { type: 'key_value', id: 'facts', source: { type: 'cases' } },
    });
    await renderApp(document, runQuery, runCases);

    expect(await screen.findByText('Suspicious login')).toBeInTheDocument();
  });

  it('remembers a column of the case that is clicked, as for any row, and opens its details', async () => {
    const document = appDocumentSchema.parse({
      state: { case_id: { type: 'string', default: '' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'table',
            id: 'cases',
            source: { type: 'cases' },
            onRowClick: [
              { type: 'setState', key: 'case_id', value: { fromColumn: 'id' } },
              { type: 'openFlyout', flyout: 'detail' },
            ],
          },
          {
            type: 'flyout',
            id: 'detail',
            title: 'Case {{state.case_id}}',
            children: [{ type: 'text', id: 'note', text: 'Selected' }],
          },
        ],
      },
    });
    const { runtime } = await renderApp(document, runQuery, runCases);

    await userEvent.click(await screen.findByRole('button', { name: 'case-2' }));

    expect(runtime.state$.getValue().case_id).toBe('case-2');
    expect(await screen.findByRole('heading', { name: 'Case case-2' })).toBeInTheDocument();
  });

  it('is filtered by what an input sets, and shows the others again when it is cleared', async () => {
    const document = appDocumentSchema.parse({
      state: { status: { type: 'string', default: '' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'select',
            id: 'pick',
            label: 'Status',
            bind: 'status',
            options: [
              { value: '', label: 'All' },
              { value: 'open', label: 'Open' },
            ],
          },
          {
            type: 'table',
            id: 'cases',
            source: { type: 'cases', status: { fromState: 'status' } },
          },
        ],
      },
    });
    await renderApp(document, runQuery, runCases);
    expect(await screen.findByText('Slow checkout')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), 'open');

    await waitFor(() => expect(screen.queryByText('Slow checkout')).not.toBeInTheDocument());
    expect(screen.getByText('Suspicious login')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox'), '');
    expect(await screen.findByText('Slow checkout')).toBeInTheDocument();
  });

  it('runs the cases again only when the value it is filtered by changes', async () => {
    const document = appDocumentSchema.parse({
      state: {
        status: { type: 'string', default: '' },
        unrelated: { type: 'string', default: '' },
      },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'search', id: 'find', label: 'Find', bind: 'unrelated' },
          {
            type: 'table',
            id: 'cases',
            source: { type: 'cases', status: { fromState: 'status' } },
          },
        ],
      },
    });
    await renderApp(document, runQuery, runCases);
    await screen.findByText('Slow checkout');
    const before = runCases.mock.calls.length;

    await userEvent.type(screen.getByRole('searchbox', { name: 'Find' }), 'x{Enter}');

    expect(runCases.mock.calls.length).toBe(before);
  });

  it('says why when the cases could not be had, with a way to try again', async () => {
    runCases.mockRejectedValueOnce(new Error('Forbidden'));
    const document = appDocumentSchema.parse({
      root: { type: 'table', id: 'cases', source: { type: 'cases' } },
    });
    await renderApp(document, runQuery, runCases);

    expect(await screen.findByText('Forbidden')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Suspicious login')).toBeInTheDocument();
  });
});
