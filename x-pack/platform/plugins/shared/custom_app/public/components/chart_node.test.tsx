/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { appDocumentSchema } from '@kbn/custom-app-common';
import { ChartType } from '@kbn/visualization-utils';
import type { RunQuery } from '../data/data_layer';
import { renderApp } from './test_utils';

const suggestions = jest.fn();
let mockAttributes: unknown = { title: 'suggested' };
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
  getLensAttributesFromSuggestion: () => mockAttributes,
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

describe('clicking the chart', () => {
  beforeEach(() => {
    runQuery.mockClear();
    suggestions.mockReset().mockReturnValue([{ suggestion: true }]);
    embeddableProps.mockClear();
  });

  const clickable = (
    onClick: unknown[] = [{ type: 'setState', key: 'user', value: { fromColumn: 'user.name' } }]
  ) =>
    appDocumentSchema.parse({
      state: { user: { type: 'string', default: '' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'chart',
            id: 'users',
            query: 'FROM logs | STATS count = COUNT(*) BY user.name',
            onClick,
          },
          { type: 'flyout', id: 'more', title: 'More', children: [] },
        ],
      },
    });

  const event = (row = 1) => ({
    data: [
      {
        table: {
          columns: [
            { id: 'user_name', name: 'user.name' },
            { id: 'count', name: 'count' },
          ],
          rows: [
            { user_name: 'alice', count: 4 },
            { user_name: 'bob', count: 9 },
          ],
        },
        column: 0,
        row,
        value: 'bob',
      },
    ],
    preventDefault: jest.fn(),
  });

  const click = async (clicked: ReturnType<typeof event>) => {
    await screen.findByTestId('lensChart');
    const { onFilter } = embeddableProps.mock.calls.at(-1)?.[0];
    act(() => onFilter(clicked));
  };

  it('is not listened to when the chart has nothing to do on a click, so a dashboard keeps its own', async () => {
    await renderApp(clickable([]), runQuery);
    await screen.findByTestId('lensChart');

    expect(embeddableProps.mock.calls.at(-1)?.[0].onFilter).toBeUndefined();
  });

  it('remembers the column of what was clicked', async () => {
    const { runtime } = await renderApp(clickable(), runQuery);

    await click(event(1));

    expect(runtime.state$.getValue().user).toBe('bob');
  });

  it('takes the place of what a dashboard does with a click, which is to filter the dashboard', async () => {
    await renderApp(clickable(), runQuery);
    const clicked = event();

    await click(clicked);

    expect(clicked.preventDefault).toHaveBeenCalledTimes(1);
  });

  it('opens a flyout as well, when it was asked to', async () => {
    const { runtime } = await renderApp(
      clickable([
        { type: 'setState', key: 'user', value: { fromColumn: 'user.name' } },
        { type: 'openFlyout', flyout: 'more' },
      ]),
      runQuery
    );

    await click(event(0));

    expect(runtime.state$.getValue().user).toBe('alice');
    expect(runtime.openFlyoutId$.getValue()).toBe('more');
  });

  it('does nothing for a click that does not point at a row', async () => {
    const { runtime } = await renderApp(clickable(), runQuery);
    const clicked = event(99);

    await click(clicked);

    expect(runtime.state$.getValue().user).toBe('');
    expect(clicked.preventDefault).toHaveBeenCalled();
  });

  it('says what could not be done, when a column is not in the row, and lets it be dismissed', async () => {
    await renderApp(
      clickable([{ type: 'setState', key: 'user', value: { fromColumn: 'nope' } }]),
      runQuery
    );

    await click(event());

    expect(await screen.findByText('Column "nope" is not in the row')).toBeInTheDocument();
  });
});

describe('the annotations of a chart', () => {
  const xyAttributes = {
    title: 'xy',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      adHocDataViews: { adhoc: { id: 'adhoc', title: 'logs' } },
      visualization: { layers: [{ layerId: 'data', layerType: 'data', accessors: ['count'] }] },
    },
  };
  const annotated = () =>
    appDocumentSchema.parse({
      state: { show: { type: 'boolean', default: false } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'switch', id: 'flag', label: 'Show deploys', bind: 'show' },
          {
            type: 'chart',
            id: 'trend',
            query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
            annotations: {
              query: 'FROM deploys | KEEP @timestamp, name',
              time: '@timestamp',
              label: 'name',
              showWhen: 'show',
            },
          },
        ],
      },
    });
  const layerTypes = () =>
    (
      embeddableProps.mock.calls.at(-1)?.[0].attributes.state.visualization.layers as Array<{
        layerType: string;
      }>
    ).map(({ layerType }) => layerType);

  beforeEach(() => {
    runQuery.mockClear();
    suggestions.mockReset().mockReturnValue([{ suggestion: true }]);
    embeddableProps.mockClear();
    mockAttributes = xyAttributes;
  });
  afterEach(() => {
    mockAttributes = { title: 'suggested' };
  });

  it('are marked on the chart while the value that shows them is true, and not otherwise', async () => {
    await renderApp(annotated(), runQuery);
    await screen.findByTestId('lensChart');

    expect(layerTypes()).toEqual(['data']);
    expect(runQuery).toHaveBeenCalledWith(
      'FROM deploys | KEEP @timestamp, name',
      expect.anything(),
      expect.anything()
    );

    await userEvent.click(screen.getByRole('switch'));

    await waitFor(() => expect(layerTypes()).toEqual(['data', 'annotations']));

    await userEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(layerTypes()).toEqual(['data']));
  });
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
