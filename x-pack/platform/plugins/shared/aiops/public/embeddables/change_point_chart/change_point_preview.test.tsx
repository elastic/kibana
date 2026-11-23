/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  ChangePointPanelPreview,
  createPreviewParentApi,
  type ChangePointPreviewStateUpdate,
} from './change_point_preview';

let embeddableMountCount = 0;

jest.mock('@kbn/embeddable-plugin/public', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  return {
    EmbeddableRenderer: jest.fn(() => {
      ReactActual.useEffect(() => {
        embeddableMountCount += 1;
      }, []);
      return <div data-test-subj="mockEmbeddableRenderer" />;
    }),
  };
});

const mockEmbeddableRenderer = jest.mocked(EmbeddableRenderer);

describe('ChangePointPanelPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    embeddableMountCount = 0;
    mockEmbeddableRenderer.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a transient preview parent API that forwards context subjects without container capabilities', () => {
    const timeRange$ = new BehaviorSubject({ from: 'now-15m', to: 'now' });
    const filters$ = new BehaviorSubject([]);
    const query$ = new BehaviorSubject({ query: 'status:200', language: 'kuery' });
    const esqlVariables$ = new BehaviorSubject<ESQLControlVariable[]>([
      { key: 'env', value: 'prod', type: ESQLVariableType.VALUES },
    ]);
    const reload$ = new Subject<void>();
    const addNewPanel = jest.fn();

    const dashboardApi = {
      timeRange$,
      filters$,
      query$,
      esqlVariables$,
      reload$,
      addNewPanel,
      removePanel: jest.fn(),
      replacePanel: jest.fn(),
      children$: new BehaviorSubject({}),
      fetchOnlyVisible$: new BehaviorSubject(true),
    };

    const previewState = { esql: 'FROM logs-* | CHANGE_POINT x ON y' };
    const previewParent = createPreviewParentApi(dashboardApi, previewState) as unknown as Record<
      string,
      unknown
    >;

    expect(previewParent.getSerializedStateForChild).toEqual(expect.any(Function));
    expect(
      (previewParent.getSerializedStateForChild as (id: string) => unknown)('transient-id')
    ).toBe(previewState);
    expect(previewParent.timeRange$).toBe(timeRange$);
    expect(previewParent.filters$).toBe(filters$);
    expect(previewParent.query$).toBe(query$);
    expect(previewParent.esqlVariables$).toBe(esqlVariables$);
    expect(previewParent.reload$).toBe(reload$);
    expect(previewParent.addNewPanel).toBeUndefined();
    expect(previewParent.children$).toBeUndefined();
    expect(previewParent.fetchOnlyVisible$).toBeUndefined();
  });

  it('shows structural errors immediately without mounting EmbeddableRenderer', () => {
    const statuses: ChangePointPreviewStateUpdate[] = [];
    render(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{ panelType: 'change_point_grid', serializedState: {} }}
          previewKey="charts:FROM logs-*"
          structuralError="Missing CHANGE_POINT"
          dashboardParentApi={{}}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    expect(screen.getByTestId('aiopsChangePointStructuralError')).toBeTruthy();
    expect(mockEmbeddableRenderer).not.toHaveBeenCalled();
    expect(statuses.at(-1)).toEqual({ key: 'charts:FROM logs-*', status: 'error' });
  });

  it('debounces preview updates, waits for rendered$ when published, and handles panels without rendered$', () => {
    const statuses: ChangePointPreviewStateUpdate[] = [];
    const { rerender } = render(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'change_point_grid',
            serializedState: { esql: 'FROM logs-* | CHANGE_POINT x ON y' },
          }}
          previewKey="charts:q1"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    expect(statuses.at(-1)).toEqual({ key: 'charts:q1', status: 'loading' });
    expect(mockEmbeddableRenderer).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockEmbeddableRenderer).toHaveBeenCalledTimes(1);
    const gridCall = mockEmbeddableRenderer.mock.calls[0][0];
    expect(gridCall.hidePanelChrome).toBe(true);

    const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
    const rendered$ = new BehaviorSubject<boolean>(false);
    const cancelRequests = jest.fn();

    act(() => {
      gridCall.onApiAvailable?.({
        dataLoading$,
        blockingError$,
        rendered$,
        cancelRequests,
      } as never);
    });
    expect(statuses.at(-1)).toEqual({ key: 'charts:q1', status: 'loading' });

    act(() => {
      dataLoading$.next(false);
    });
    // Still waiting on rendered$ for change_point_grid
    expect(statuses.at(-1)).toEqual({ key: 'charts:q1', status: 'loading' });

    act(() => {
      rendered$.next(true);
    });
    expect(statuses.at(-1)).toEqual({ key: 'charts:q1', status: 'ready' });

    // Switch to Table (discover_session does not publish rendered$)
    rerender(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'discover_session',
            serializedState: { tabs: [] },
          }}
          previewKey="table:q1"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    // Immediately transitions back to loading while debouncing
    expect(statuses.at(-1)).toEqual({ key: 'table:q1', status: 'loading' });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(cancelRequests).toHaveBeenCalledTimes(1);

    const tableCall = mockEmbeddableRenderer.mock.calls.at(-1)![0];
    const tableLoading$ = new BehaviorSubject<boolean | undefined>(true);
    const tableError$ = new BehaviorSubject<Error | undefined>(undefined);

    act(() => {
      tableCall.onApiAvailable?.({
        dataLoading$: tableLoading$,
        blockingError$: tableError$,
      } as never);
    });
    expect(statuses.at(-1)).toEqual({ key: 'table:q1', status: 'loading' });

    // Empty table finishes loading without rendered$ -> ready
    act(() => {
      tableLoading$.next(false);
    });
    expect(statuses.at(-1)).toEqual({ key: 'table:q1', status: 'ready' });

    // Error marks preview as error
    act(() => {
      tableError$.next(new Error('License error'));
    });
    expect(statuses.at(-1)).toEqual({ key: 'table:q1', status: 'error' });
  });

  it('ignores stale completion from a superseded preview generation', () => {
    const statuses: ChangePointPreviewStateUpdate[] = [];
    const { rerender } = render(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{ panelType: 'change_point_grid', serializedState: { esql: 'q1' } }}
          previewKey="charts:q1"
          dashboardParentApi={{}}
          debounceMs={100}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });
    const firstCall = mockEmbeddableRenderer.mock.calls[0][0];

    rerender(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{ panelType: 'change_point_grid', serializedState: { esql: 'q2' } }}
          previewKey="charts:q2"
          dashboardParentApi={{}}
          debounceMs={100}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Late api resolution from the unmounted q1 renderer must be ignored and cancelled
    const staleCancel = jest.fn();
    act(() => {
      firstCall.onApiAvailable?.({
        dataLoading$: new BehaviorSubject(false),
        blockingError$: new BehaviorSubject(undefined),
        rendered$: new BehaviorSubject(true),
        cancelRequests: staleCancel,
      } as never);
    });

    expect(staleCancel).toHaveBeenCalledTimes(1);
    expect(statuses.at(-1)).toEqual({ key: 'charts:q2', status: 'loading' });
  });

  it('preserves an already-ready preview when panelPackage changes identity with the same previewKey or reverts before debounce', () => {
    const statuses: ChangePointPreviewStateUpdate[] = [];
    const { rerender } = render(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'change_point_grid',
            serializedState: { esql: 'q1', configuration: { mode: 'form' } },
          }}
          previewKey="charts:::q1"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    const cancelRequests = jest.fn();
    act(() => {
      mockEmbeddableRenderer.mock.calls[0][0].onApiAvailable?.({
        dataLoading$: new BehaviorSubject(false),
        blockingError$: new BehaviorSubject(undefined),
        rendered$: new BehaviorSubject(true),
        cancelRequests,
      } as never);
    });
    expect(statuses.at(-1)).toEqual({ key: 'charts:::q1', status: 'ready' });

    // A new panel package with the same preview key does not remount the preview.
    rerender(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'change_point_grid',
            serializedState: { esql: 'q1', configuration: { mode: 'esql' } },
          }}
          previewKey="charts:::q1"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(cancelRequests).not.toHaveBeenCalled();
    expect(embeddableMountCount).toBe(1);
    expect(statuses.at(-1)).toEqual({ key: 'charts:::q1', status: 'ready' });

    // Brief edit followed by revert within the debounce window keeps the mounted preview alive
    rerender(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'change_point_grid',
            serializedState: { esql: 'q2', configuration: { mode: 'esql' } },
          }}
          previewKey="charts:::q2"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );
    expect(statuses.at(-1)).toEqual({ key: 'charts:::q2', status: 'loading' });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender(
      <EuiProvider>
        <ChangePointPanelPreview
          panelPackage={{
            panelType: 'change_point_grid',
            serializedState: { esql: 'q1', configuration: { mode: 'esql' } },
          }}
          previewKey="charts:::q1"
          dashboardParentApi={{}}
          debounceMs={300}
          onStatusChange={(update) => statuses.push(update)}
        />
      </EuiProvider>
    );

    expect(cancelRequests).not.toHaveBeenCalled();
    expect(embeddableMountCount).toBe(1);
    expect(statuses.at(-1)).toEqual({ key: 'charts:::q1', status: 'ready' });
  });
});
