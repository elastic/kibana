/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { ChartType } from '@kbn/visualization-utils';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from './test_utils';

const suggestions = jest.fn();
const embeddableProps = jest.fn();

// One object for every call, as the real services are: a new one would restart the chart each render.
jest.mock('../services', () => {
  const services = {
    dataViews: {},
    lens: {
      stateHelperApi: async () => ({ suggestions: (...args: unknown[]) => suggestions(...args) }),
      EmbeddableComponent: (props: Record<string, unknown>) => {
        embeddableProps(props);
        return <div data-test-subj="lensChart" />;
      },
    },
  };
  return { getServices: () => services };
});
jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLAdHocDataview: async () => ({ toSpec: () => ({ id: 'adhoc' }) }),
}));
jest.mock('@kbn/visualization-utils', () => ({
  ...jest.requireActual('@kbn/visualization-utils'),
  getLensAttributesFromSuggestion: () => ({ title: 'suggested' }),
}));

const runQuery = jest.fn<ReturnType<RunQuery>, Parameters<RunQuery>>(async () => ({
  columns: [
    { name: '@timestamp', type: 'date' },
    { name: 'count', type: 'long' },
  ],
  rows: [['2026-01-01', 3]],
}));

const documentWith = (chart: Record<string, unknown> = {}) =>
  appDocumentSchema.parse({
    state: { service: { type: 'string', default: 'cart' } },
    root: {
      type: 'chart',
      id: 'trend',
      query: 'FROM logs | WHERE service == ?service | STATS count = COUNT(*) BY @timestamp',
      ...chart,
    },
  });

describe('the chart node', () => {
  beforeEach(() => {
    runQuery.mockClear();
    suggestions.mockReset().mockReturnValue([{ suggestion: true }]);
    embeddableProps.mockClear();
  });

  it('draws what Lens suggests for the columns of the query, with the panel state as variables', async () => {
    await renderApp(documentWith(), runQuery);

    expect(await screen.findByTestId('lensChart')).toBeInTheDocument();
    expect(
      suggestions.mock.calls[0][0].textBasedColumns.map(({ name }: { name: string }) => name)
    ).toEqual(['@timestamp', 'count']);
    expect(suggestions.mock.calls[0][3]).toBeUndefined();
    const props = embeddableProps.mock.calls.at(-1)?.[0];
    expect(props.attributes).toEqual({ title: 'suggested' });
    expect(props.timeRange).toEqual({ from: 'now-15m', to: 'now' });
    expect(props.esqlVariables).toEqual([
      expect.objectContaining({ key: 'service', value: 'cart' }),
    ]);
  });

  it('asks for the type the author chose', async () => {
    await renderApp(documentWith({ chartType: 'line' }), runQuery);

    await screen.findByTestId('lensChart');
    expect(suggestions.mock.calls[0][3]).toBe(ChartType.Line);
  });

  it('shows its heading above the chart', async () => {
    await renderApp(documentWith({ title: 'Requests over time' }), runQuery);

    expect(await screen.findByRole('heading', { name: 'Requests over time' })).toBeInTheDocument();
  });

  it('says so when no chart fits the columns', async () => {
    suggestions.mockReturnValue([]);
    await renderApp(documentWith(), runQuery);

    expect(await screen.findByText('This chart cannot be shown')).toBeInTheDocument();
    expect(screen.queryByTestId('lensChart')).not.toBeInTheDocument();
  });

  it('does not draw a chart for a query that failed, and says why', async () => {
    runQuery.mockRejectedValueOnce(new Error('Unknown column [nope]'));
    await renderApp(documentWith(), runQuery);

    await waitFor(() => expect(screen.getByText(/Unknown column \[nope\]/)).toBeInTheDocument());
    expect(screen.queryByTestId('lensChart')).not.toBeInTheDocument();
  });

  it('keeps the chart when only the rows change, not the shape of the result', async () => {
    const { layer } = await renderApp(documentWith(), runQuery);
    await screen.findByTestId('lensChart');
    const built = suggestions.mock.calls.length;

    await act(async () => layer.retry());
    await waitFor(() => expect(runQuery).toHaveBeenCalledTimes(2));

    expect(suggestions.mock.calls.length).toBe(built);
  });
});
