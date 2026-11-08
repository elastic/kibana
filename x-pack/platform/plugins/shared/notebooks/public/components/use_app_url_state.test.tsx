/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Router } from '@kbn/shared-ux-router';
import { BehaviorSubject } from 'rxjs';
import type { NotebookApp } from '../../common/types';
import { NotebookStore } from '../model/notebook_store';
import type { SidePanel } from './notebook_context';
import { useAppUrlState } from './use_app_url_state';

const app = (id: string): NotebookApp => ({ id, title: id, panels: [] });

const setup = (path: string, apps: NotebookApp[] = [app('one'), app('two')]) => {
  const history = createMemoryHistory({ initialEntries: [path] });
  const notebook = {
    store: new NotebookStore({ title: 'Notebook', cellOrder: [], cells: {}, panels: apps }),
    sidePanel$: new BehaviorSubject<SidePanel | undefined>(undefined),
    activeAppId$: new BehaviorSubject<string | undefined>(undefined),
  };
  const wrapper = ({ children }: PropsWithChildren) => (
    <Router history={history}>{children}</Router>
  );
  renderHook(() => useAppUrlState(notebook), { wrapper });
  return { history, ...notebook };
};

describe('useAppUrlState', () => {
  it('opens the app panel on the app in the URL', () => {
    const { sidePanel$, activeAppId$ } = setup('/view/n?app=two');

    expect(sidePanel$.getValue()).toBe('app');
    expect(activeAppId$.getValue()).toBe('two');
  });

  it('writes the shown app to the URL as the panel opens, switches and closes', () => {
    const { history, sidePanel$, activeAppId$ } = setup('/view/n?other=1');

    act(() => sidePanel$.next('app'));
    expect(history.location.search).toBe('?other=1&app=one');

    act(() => activeAppId$.next('two'));
    expect(history.location.search).toBe('?other=1&app=two');

    act(() => sidePanel$.next(undefined));
    expect(history.location.search).toBe('?other=1');
    expect(history.length).toBe(1);
  });

  it('follows the URL when it changes', () => {
    const { history, sidePanel$, activeAppId$ } = setup('/view/n?app=one');

    act(() => history.push('/view/n?app=two'));
    expect(activeAppId$.getValue()).toBe('two');

    act(() => history.push('/view/n'));
    expect(sidePanel$.getValue()).toBeUndefined();
  });

  it('keeps an empty parameter while the panel is open with no apps', () => {
    const { history, sidePanel$ } = setup('/view/n', []);

    act(() => sidePanel$.next('app'));
    expect(history.location.search).toBe('?app=');
    expect(sidePanel$.getValue()).toBe('app');
  });
});
