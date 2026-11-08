/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { NOTEBOOK_APP_PARAM } from '../../common/constants';
import type { NotebookContextValue } from './notebook_context';

/**
 * The `app` query parameter for the location: the app's id while the app panel is open, empty
 * while it is open with no apps, and absent while it is closed.
 */
export const getAppParam = (search: string): string | undefined =>
  new URLSearchParams(search).get(NOTEBOOK_APP_PARAM) ?? undefined;

/** Keeps the `app` query parameter and the app panel in step, whichever of them changes. */
export const useAppUrlState = ({
  store,
  sidePanel$,
  activeAppId$,
}: Pick<NotebookContextValue, 'store' | 'sidePanel$' | 'activeAppId$'>): void => {
  const history = useHistory();
  const urlAppId = getAppParam(useLocation().search);

  useEffect(() => {
    if (urlAppId === undefined) {
      if (sidePanel$.getValue() === 'app') sidePanel$.next(undefined);
      return;
    }
    const appId = urlAppId || undefined;
    if (activeAppId$.getValue() !== appId) activeAppId$.next(appId);
    if (sidePanel$.getValue() !== 'app') sidePanel$.next('app');
  }, [urlAppId, sidePanel$, activeAppId$]);

  useEffect(() => {
    const subscription = combineLatest([sidePanel$, activeAppId$, store.apps$])
      .pipe(
        map(([sidePanel, activeAppId, apps]) => {
          if (sidePanel !== 'app') return undefined;
          const app = apps.find(({ id }) => id === activeAppId) ?? apps[0];
          return app?.id ?? '';
        }),
        distinctUntilChanged()
      )
      .subscribe((appParam) => {
        const { location } = history;
        if (getAppParam(location.search) === appParam) return;
        const params = new URLSearchParams(location.search);
        if (appParam === undefined) params.delete(NOTEBOOK_APP_PARAM);
        else params.set(NOTEBOOK_APP_PARAM, appParam);
        const search = params.toString();
        history.replace({ ...location, search: search ? `?${search}` : '' });
      });
    return () => subscription.unsubscribe();
  }, [history, store, sidePanel$, activeAppId$]);
};
