/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import type { FetchContext } from '@kbn/presentation-publishing';
import { appDocumentSchema } from '@kbn/custom-app-common';
import type { DataLayer } from '../data/data_layer';
import { DataLayerContext } from '../data/data_layer_context';
import { createAppRuntime } from '../runtime/app_runtime';
import { AppRuntimeContext } from '../runtime/app_runtime_context';
import { TimeRangeControlContext } from '../runtime/time_range_context';
import { NodeRenderer } from './node_renderer';

// The picker is a popover that cannot be driven here; what matters is what the component shows of
// the period, and what it tells the host when it is changed.
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiSuperDatePicker: ({
    start,
    end,
    isDisabled,
    onTimeChange,
  }: {
    start: string;
    end: string;
    isDisabled?: boolean;
    onTimeChange: (range: { start: string; end: string }) => void;
  }) => (
    <button
      type="button"
      data-test-subj="picker"
      disabled={isDisabled}
      onClick={() => onTimeChange({ start: 'now-7d', end: 'now' })}
    >
      {`${start} to ${end}`}
    </button>
  ),
}));

const document = (children: unknown[]) =>
  appDocumentSchema.parse({
    state: { view: { type: 'string', default: 'a' } },
    root: { type: 'stack', id: 'root', children },
  });

// `null` is none: leaving a parameter out, or undefined, gives it its default.
const setup = ({
  context = { timeRange: { from: 'now-1h', to: 'now' } } as Partial<FetchContext> | null,
  setTimeRange = jest.fn() as jest.Mock | null,
  children = [{ type: 'time_range', id: 'when' }] as unknown[],
} = {}) => {
  const context$ = new BehaviorSubject<FetchContext | undefined>(
    context === null ? undefined : (context as FetchContext)
  );
  const layer = { context$ } as unknown as DataLayer;
  const app = document(children);
  render(
    <AppRuntimeContext.Provider value={createAppRuntime(app)}>
      <DataLayerContext.Provider value={layer}>
        <TimeRangeControlContext.Provider
          value={setTimeRange === null ? undefined : { setTimeRange }}
        >
          <NodeRenderer node={app.root} />
        </TimeRangeControlContext.Provider>
      </DataLayerContext.Provider>
    </AppRuntimeContext.Provider>
  );
  return { context$, setTimeRange };
};

describe('the time range component', () => {
  it('shows the period the queries are running with', () => {
    setup();

    expect(screen.getByTestId('picker')).toHaveTextContent('now-1h to now');
  });

  it('shows the last day until the first fetch says what the period is', () => {
    setup({ context: null });

    expect(screen.getByTestId('picker')).toHaveTextContent('now-24h to now');
  });

  it('follows the period when it changes, whoever changed it', () => {
    const { context$ } = setup();

    act(() =>
      context$.next({ timeRange: { from: 'now-30d', to: 'now' } } as unknown as FetchContext)
    );

    expect(screen.getByTestId('picker')).toHaveTextContent('now-30d to now');
  });

  it('tells where the app is shown that the period was changed, and leaves what that means to it', async () => {
    const { setTimeRange } = setup();

    await userEvent.click(screen.getByTestId('picker'));

    expect(setTimeRange).toHaveBeenCalledWith({ from: 'now-7d', to: 'now' });
  });

  it('is shown but cannot be used where the period cannot be changed', () => {
    setup({ setTimeRange: null });

    expect(screen.getByTestId('picker')).toBeDisabled();
  });

  it('is one of the filters when it is placed with the others, and is drawn with them', () => {
    setup({
      children: [
        {
          type: 'stack',
          id: 'filters',
          direction: 'horizontal',
          children: [
            { type: 'time_range', id: 'when' },
            {
              type: 'button_group',
              id: 'group',
              label: 'View',
              bind: 'view',
              options: [{ value: 'a' }],
            },
          ],
        },
      ],
    });

    expect(screen.getByTestId('customAppFilterBar')).toContainElement(screen.getByTestId('picker'));
  });

  it('takes only the room it needs in a row, while the filters share the rest', () => {
    setup({
      children: [
        {
          type: 'stack',
          id: 'filters',
          direction: 'horizontal',
          children: [
            {
              type: 'button_group',
              id: 'group',
              label: 'View',
              bind: 'view',
              options: [{ value: 'a' }],
            },
            { type: 'time_range', id: 'when' },
          ],
        },
      ],
    });

    expect(screen.getByTestId('customAppTimeRangeItem')).toHaveStyle({ flexGrow: '0' });
    expect(screen.getByRole('group', { name: 'View' }).closest('.euiFlexItem')).toHaveStyle({
      flexGrow: '1',
    });
  });

  it('is in the filter bar when it is the only thing in the row', () => {
    setup({
      children: [
        {
          type: 'stack',
          id: 'filters',
          direction: 'horizontal',
          children: [{ type: 'time_range', id: 'when' }],
        },
      ],
    });

    expect(screen.getByTestId('customAppFilterBar')).toContainElement(
      screen.getByTestId('customAppTimeRangeItem')
    );
  });

  it('can be anywhere else in the layout, as nothing makes it a filter', () => {
    setup({
      children: [
        { type: 'heading', id: 'title', text: 'Orders' },
        { type: 'time_range', id: 'when' },
      ],
    });

    expect(screen.queryByTestId('customAppFilterBar')).not.toBeInTheDocument();
    expect(screen.getByTestId('picker')).toBeInTheDocument();
  });
});
