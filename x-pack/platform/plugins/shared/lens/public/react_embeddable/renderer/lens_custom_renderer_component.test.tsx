/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { LensRendererProps } from '@kbn/lens-common';
import { getLensComponentProps } from '../mocks';
import type { LensParentApi } from './types';

interface RendererProps {
  getParentApi: () => Partial<LensParentApi>;
  hidePanelChrome: boolean;
  onApiAvailable: (api: unknown) => void;
  panelProps: {
    getActions: (triggerId: string, context: object) => Promise<Array<{ id: string }>>;
  };
}

let lastGetParentApi: (() => Partial<LensParentApi>) | undefined;
let lastProps: RendererProps | undefined;

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: (props: RendererProps) => {
    lastProps = props;
    lastGetParentApi = props.getParentApi;
    return null;
  },
}));

// Import after the mock so the component picks up the mocked EmbeddableRenderer
// eslint-disable-next-line @kbn/compat/import-order
import { LensRenderer } from './lens_custom_renderer_component';

describe('LensRenderer interactivity inheritance', () => {
  beforeEach(() => {
    lastGetParentApi = undefined;
  });

  it('forwards the parent viewMode$ and disableTriggers$ when no explicit overrides are provided', () => {
    const dashboardParentApi = {
      viewMode$: new BehaviorSubject('non-interactive'),
      disableTriggers$: new BehaviorSubject(true),
    };

    const props = getLensComponentProps({
      parentApi: dashboardParentApi,
    }) as unknown as LensRendererProps;

    render(<LensRenderer {...props} />);

    const parentApi = lastGetParentApi?.();
    expect(parentApi?.viewMode$).toBe(dashboardParentApi.viewMode$);
    expect(parentApi?.disableTriggers$).toBe(dashboardParentApi.disableTriggers$);
  });
});

describe('LensRenderer project routing', () => {
  beforeEach(() => {
    lastGetParentApi = undefined;
  });

  it('publishes the projectRouting prop to the embeddable', () => {
    const props = getLensComponentProps({
      projectRouting: '_alias:*',
    }) as unknown as LensRendererProps;

    render(<LensRenderer {...props} />);

    expect(lastGetParentApi?.().projectRouting$?.getValue()).toBe('_alias:*');
  });

  it('forwards the parent projectRouting$ over the prop', () => {
    const dashboardParentApi = { projectRouting$: new BehaviorSubject('_alias:_origin') };

    const props = getLensComponentProps({
      parentApi: dashboardParentApi,
      projectRouting: '_alias:*',
    }) as unknown as LensRendererProps;

    render(<LensRenderer {...props} />);

    expect(lastGetParentApi?.().projectRouting$).toBe(dashboardParentApi.projectRouting$);
  });
});

describe('LensRenderer built-in actions', () => {
  const lensApi = {
    updateAttributes: jest.fn(),
    updateOverrides: jest.fn(),
    setDescription: jest.fn(),
    getTriggerCompatibleActions: jest.fn(async () => [
      { id: 'ACTION_OPEN_IN_DISCOVER' },
      { id: 'ACTION_OPEN_IN_LENS' },
      { id: 'ACTION_SAVE_LENS_TO_DASHBOARD' },
    ]),
  };
  const extraAction = { id: 'extra' };

  const renderWithProps = (overrides: Partial<LensRendererProps>) => {
    const props = getLensComponentProps(overrides) as unknown as LensRendererProps;
    render(<LensRenderer {...props} />);
    act(() => lastProps?.onApiAvailable(lensApi));
    return lastProps!;
  };

  beforeEach(() => {
    lastProps = undefined;
    lensApi.getTriggerCompatibleActions.mockClear();
  });

  it('publishes the requested built-in actions to the embeddable', () => {
    renderWithProps({ builtInActions: ['openInLens'] });

    expect(lastGetParentApi?.().builtInActionIds$?.getValue()).toEqual(['openInLens']);
  });

  it('hides the panel chrome when no actions are requested', () => {
    expect(renderWithProps({}).hidePanelChrome).toBe(true);
  });

  it('shows the panel chrome when a built-in action is requested', () => {
    expect(renderWithProps({ builtInActions: ['saveToDashboard'] }).hidePanelChrome).toBe(false);
  });

  it('only returns the built-in actions without the default actions', async () => {
    const { panelProps } = renderWithProps({
      builtInActions: ['openInLens'],
      extraActions: [extraAction as never],
    });

    const actions = await panelProps.getActions('trigger', {});

    expect(actions.map(({ id }) => id)).toEqual([
      'extra',
      'ACTION_OPEN_IN_LENS',
      'ACTION_SAVE_LENS_TO_DASHBOARD',
    ]);
  });

  it('returns all the compatible actions with the default actions', async () => {
    const { panelProps } = renderWithProps({ withDefaultActions: true });

    const actions = await panelProps.getActions('trigger', {});

    expect(actions.map(({ id }) => id)).toEqual([
      'ACTION_OPEN_IN_DISCOVER',
      'ACTION_OPEN_IN_LENS',
      'ACTION_SAVE_LENS_TO_DASHBOARD',
    ]);
  });

  it('does not look for compatible actions when only extra actions are provided', async () => {
    const { panelProps } = renderWithProps({ extraActions: [extraAction as never] });

    const actions = await panelProps.getActions('trigger', {});

    expect(actions).toEqual([extraAction]);
    expect(lensApi.getTriggerCompatibleActions).not.toHaveBeenCalled();
  });
});
