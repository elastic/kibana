/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action } from 'redux';
import { Epic } from 'redux-observable';
import { timer } from 'rxjs';
import { exhaustMap, filter, map, takeUntil, withLatestFrom } from 'rxjs/operators';

import { jumpToTime, startAutoReload, stopAutoReload } from './actions';

interface WaffleTimeEpicDependencies<State> {
  selectWaffleTimeUpdatePolicyInterval: (state: State) => number | null;
}

export const createWaffleTimeEpic = <State>(): Epic<
  Action,
  Action,
  State,
  WaffleTimeEpicDependencies<State>
> => (action$, state$, { selectWaffleTimeUpdatePolicyInterval }) => {
  const updateInterval$ = state$.pipe(map(selectWaffleTimeUpdatePolicyInterval), filter(isNotNull));

  return action$.pipe(
    filter(startAutoReload.match),
    withLatestFrom(updateInterval$),
    exhaustMap(([action, updateInterval]) =>
      timer(0, updateInterval).pipe(
        map(() => jumpToTime(Date.now())),
        takeUntil(action$.pipe(filter(stopAutoReload.match)))
      )
    )
  );
};

const isNotNull = <T>(value: T | null): value is T => value !== null;
