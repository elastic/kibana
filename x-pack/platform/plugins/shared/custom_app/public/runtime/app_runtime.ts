/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import {
  MAX_STATE_STRING_LENGTH,
  getNodeChildren,
  getStateDefaults,
  type Action,
  type AppDocument,
  type StateDeclaration,
  type StateValue,
} from '@kbn/custom-app-common';

export type StateValues = Readonly<Record<string, StateValue>>;

/** What the interaction that ran the actions carries: a clicked row, or an input's new value. */
export interface ActionInput {
  row?: Readonly<Record<string, unknown>>;
  input?: unknown;
}

export interface RunActionsResult {
  /** The actions, or parts of them, that were not applied, each with the reason. */
  dropped: string[];
}

export interface AppRuntime {
  state$: BehaviorSubject<StateValues>;
  /** The id of the flyout that is open, if any. */
  openFlyoutId$: BehaviorSubject<string | undefined>;
  /** Runs actions in order, each seeing the effect of the ones before it. */
  run: (actions: readonly Action[], input?: ActionInput) => RunActionsResult;
  /** Follows the document when it changes, keeping the values that are still valid. */
  setDocument: (document: Pick<AppDocument, 'state' | 'root'>) => void;
}

const describe = (value: unknown): string => (value === null ? 'null' : typeof value);

/** Returns why a value cannot be stored under a key, or undefined when it can. */
const rejectValue = (
  key: string,
  declaration: StateDeclaration,
  value: unknown
): string | undefined => {
  if (typeof value !== declaration.type) {
    return `"${key}" expects a ${declaration.type} but got ${describe(value)}`;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return `"${key}" expects a finite number`;
  }
  if (typeof value === 'string' && value.length > MAX_STATE_STRING_LENGTH) {
    return `"${key}" expects at most ${MAX_STATE_STRING_LENGTH} characters`;
  }
};

const collectFlyoutIds = (root: AppDocument['root']): Set<string> => {
  const ids = new Set<string>();
  const pending = [root];
  for (let node = pending.pop(); node; node = pending.pop()) {
    if (node.type === 'flyout') ids.add(node.id);
    pending.push(...getNodeChildren(node));
  }
  return ids;
};

export const createAppRuntime = (document: Pick<AppDocument, 'state' | 'root'>): AppRuntime => {
  let declarations = document.state;
  let flyoutIds = collectFlyoutIds(document.root);
  const state$ = new BehaviorSubject<StateValues>(getStateDefaults(declarations));
  const openFlyoutId$ = new BehaviorSubject<string | undefined>(undefined);

  const setState = (
    key: string,
    value: Extract<Action, { type: 'setState' }>['value'],
    input: ActionInput,
    dropped: string[]
  ) => {
    const declaration = declarations[key];
    if (!declaration) {
      dropped.push(`Unknown state key "${key}"`);
      return;
    }

    let resolved: unknown;
    if (typeof value !== 'object') {
      resolved = value;
    } else if ('fromColumn' in value) {
      if (!input.row || !(value.fromColumn in input.row)) {
        dropped.push(`Column "${value.fromColumn}" is not in the row`);
        return;
      }
      resolved = input.row[value.fromColumn];
    } else {
      resolved = input.input;
    }

    const rejection = rejectValue(key, declaration, resolved);
    if (rejection) {
      dropped.push(rejection);
      return;
    }
    if (state$.getValue()[key] === resolved) return;
    state$.next({ ...state$.getValue(), [key]: resolved as StateValue });
  };

  return {
    state$,
    openFlyoutId$,
    run: (actions, input = {}) => {
      const dropped: string[] = [];

      actions.forEach((action) => {
        switch (action.type) {
          case 'setState':
            setState(action.key, action.value, input, dropped);
            break;
          case 'openFlyout':
            if (flyoutIds.has(action.flyout)) {
              openFlyoutId$.next(action.flyout);
            } else {
              dropped.push(`"${action.flyout}" is not a flyout`);
            }
            break;
          case 'closeFlyout':
            openFlyoutId$.next(undefined);
            break;
        }
      });

      return { dropped };
    },
    setDocument: (next) => {
      declarations = next.state;
      flyoutIds = collectFlyoutIds(next.root);

      const current = state$.getValue();
      const merged = Object.fromEntries(
        Object.entries(declarations).map(([key, declaration]) => [
          key,
          key in current && typeof current[key] === declaration.type
            ? current[key]
            : declaration.default,
        ])
      );
      const changed =
        Object.keys(merged).length !== Object.keys(current).length ||
        Object.entries(merged).some(([key, value]) => current[key] !== value);
      if (changed) state$.next(merged);

      const open = openFlyoutId$.getValue();
      if (open !== undefined && !flyoutIds.has(open)) openFlyoutId$.next(undefined);
    },
  };
};
