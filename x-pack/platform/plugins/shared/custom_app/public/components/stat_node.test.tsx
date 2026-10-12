/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FetchContext } from '@kbn/presentation-publishing';
import { appDocumentSchema, type AppNode } from '@kbn/custom-app-common';
import { createDataLayer, type RunQuery, type SourceData } from '../data/data_layer';
import { DataLayerContext } from '../data/data_layer_context';
import { NodeRenderer } from './node_renderer';
import { renderWithRuntime } from './test_utils';

const context = { timeRange: { from: 'now-15m', to: 'now' } } as FetchContext;

const statNode = (overrides: Record<string, unknown> = {}): AppNode =>
  appDocumentSchema.parse({
    dataSources: { users: { type: 'esql', query: 'ROW users = 1' } },
    root: { type: 'stat', id: 'users-stat', title: 'Active users', source: 'users', ...overrides },
  }).root;

const data = (columns: string[], row: unknown[] | undefined): SourceData => ({
  columns: columns.map((name) => ({ name, type: 'long' })),
  rows: row ? [row] : [],
});

const renderStat = async (node: AppNode, runQuery: RunQuery) => {
  const layer = createDataLayer({ runQuery, getParameterNames: () => [] });
  layer.setSources({ users: { type: 'esql', query: 'ROW users = 1' } });
  renderWithRuntime(
    <DataLayerContext.Provider value={layer}>
      <NodeRenderer node={node} />
    </DataLayerContext.Provider>
  );
  await act(async () => layer.refresh(context));
  return layer;
};

describe('StatNode', () => {
  it('shows a loading state until the source settles', async () => {
    let settle: (value: SourceData) => void = () => {};
    const runQuery: RunQuery = () => new Promise((resolve) => (settle = resolve));

    await renderStat(statNode(), runQuery);
    expect(screen.queryByTestId('customAppStat')).not.toBeInTheDocument();

    settle(data(['users'], [1284]));
    expect(await screen.findByTestId('customAppStat')).toBeInTheDocument();
  });

  it('shows the first column of the first row with the title as its description', async () => {
    await renderStat(statNode(), async () => data(['users'], [1284]));

    expect(await screen.findByText('1,284')).toBeInTheDocument();
    expect(screen.getByText('Active users')).toBeInTheDocument();
  });

  it('formats compactly when asked', async () => {
    await renderStat(statNode({ format: 'compact' }), async () => data(['users'], [1_284_000]));

    expect(await screen.findByText('1.3M')).toBeInTheDocument();
  });

  it('reads the named column when valueField is set', async () => {
    await renderStat(statNode({ valueField: 'errors' }), async () =>
      data(['users', 'errors'], [1284, 7])
    );

    expect(await screen.findByText('7')).toBeInTheDocument();
  });

  it('says so when the named column is not in the results', async () => {
    await renderStat(statNode({ valueField: 'missing' }), async () => data(['users'], [1284]));

    expect(await screen.findByText('The query has no column named "missing"')).toBeInTheDocument();
  });

  it('shows a dash for a null value', async () => {
    await renderStat(statNode(), async () => data(['users'], [null]));

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('shows an empty state when the query returns no rows', async () => {
    await renderStat(statNode(), async () => data(['users'], undefined));

    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });

  it('shows the error with a retry that runs the query again', async () => {
    const runQuery = jest
      .fn<ReturnType<RunQuery>, Parameters<RunQuery>>()
      .mockRejectedValueOnce(new Error('Unknown column [users]'))
      .mockResolvedValueOnce(data(['users'], [5]));

    await renderStat(statNode(), runQuery);
    expect(await screen.findByText('Unable to load data')).toBeInTheDocument();
    expect(screen.getByText('Unknown column [users]')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(runQuery).toHaveBeenCalledTimes(2);
  });
});
