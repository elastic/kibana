/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as Rx from 'rxjs';

interface Props {
  [key: string]: unknown | ((...args: unknown[]) => void);
}

/**
 * This is a helper to tie state updates that happen somewhere else back to an react state.
 * It is roughly comparable to `reactDirective`, but does not have to be used from within a
 * template.
 *
 * This is a temporary solution until the state of Workspace internals is moved outside
 * of mutable object to the redux state (at least blocklistedNodes, canEditDrillDownUrls and
 * unblocklist action in this case).
 *
 * @param collectProps Function that collects properties from the scope that should be passed
 * into the observable. All functions passed along will be wrapped to cause a react render
 * and refresh the observable afterwards with a new call to `collectProps`. By doing so, react
 * will receive an update outside of it local state and the results are passed back via the observable.
 */
export function asSyncedObservable(collectProps: () => Props) {
  const boundCollectProps = () => {
    const collectedProps = collectProps();
    Object.keys(collectedProps).forEach((key) => {
      const currentValue = collectedProps[key];
      if (typeof currentValue === 'function') {
        collectedProps[key] = (...args: unknown[]) => {
          currentValue(...args);
          subject$.next(boundCollectProps());
        };
      }
    });
    return collectedProps;
  };
  const subject$ = new Rx.BehaviorSubject(boundCollectProps());
  return subject$.asObservable();
}
