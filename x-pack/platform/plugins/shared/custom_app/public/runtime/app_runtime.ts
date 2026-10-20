/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import isEqual from 'lodash/isEqual';
import {
  MAX_LIST_ITEMS,
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

/** What a workflow is handed: plain values, as a workflow takes them. */
export type WorkflowInputValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<string | number | boolean | null>;

/** A workflow that an action asks to be run, with every input already resolved. */
export interface WorkflowRunRequest {
  workflow: string;
  inputs: Readonly<Record<string, WorkflowInputValue>>;
}

export interface RunActionsResult {
  /** The actions, or parts of them, that were not applied, each with the reason. */
  dropped: string[];
  /**
   * The workflows to run. The runtime does not run them: that takes the user's say, and the network.
   * What is handed over is as the app was when the action reached it, so a value set before it counts.
   */
  workflows: WorkflowRunRequest[];
}

export interface AppRuntime {
  state$: BehaviorSubject<StateValues>;
  /** The id of the flyout that is open, if any. */
  openFlyoutId$: BehaviorSubject<string | undefined>;
  /** Runs actions in order, each seeing the effect of the ones before it. */
  run: (actions: readonly Action[], input?: ActionInput) => RunActionsResult;
  /** Follows the document when it changes, keeping the values that are still valid. */
  setDocument: (document: Pick<AppDocument, 'state' | 'root'>) => void;
  /**
   * Puts the app as a view says: the values it names are set, every other value of `keys` goes
   * back to how it starts, and the flyout of the view is open, or none. A value that is not
   * valid for its key is left at how it starts.
   */
  restoreView: (
    view: { values: Readonly<Record<string, StateValue>>; flyout?: string },
    keys: readonly string[]
  ) => void;
}

const describe = (value: unknown): string =>
  value === null ? 'null' : Array.isArray(value) ? 'a list' : typeof value;

/** Whether a value is of the kind a key was declared as. */
const hasType = (value: unknown, declaration: StateDeclaration): boolean =>
  declaration.type === 'list' ? Array.isArray(value) : typeof value === declaration.type;

/** Returns why a value cannot be stored under a key, or undefined when it can. */
const rejectValue = (
  key: string,
  declaration: StateDeclaration,
  value: unknown
): string | undefined => {
  if (!hasType(value, declaration)) {
    return `"${key}" expects ${
      declaration.type === 'list' ? 'a list' : `a ${declaration.type}`
    } but got ${describe(value)}`;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_LIST_ITEMS) return `"${key}" expects at most ${MAX_LIST_ITEMS} values`;
    if (
      !value.every((item) => typeof item === 'string' && item.length <= MAX_STATE_STRING_LENGTH)
    ) {
      return `"${key}" expects a list of texts of at most ${MAX_STATE_STRING_LENGTH} characters`;
    }
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return `"${key}" expects a finite number`;
  }
  if (typeof value === 'string' && value.length > MAX_STATE_STRING_LENGTH) {
    return `"${key}" expects at most ${MAX_STATE_STRING_LENGTH} characters`;
  }
};

const isPlainValue = (value: unknown): value is string | number | boolean | null =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

/** A column holds a value, or several, as ES|QL does; anything else is not something to hand over. */
const toWorkflowInput = (value: unknown): WorkflowInputValue | undefined => {
  if (isPlainValue(value)) return value;
  if (Array.isArray(value) && value.every(isPlainValue)) return value;
  return undefined;
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
    if (typeof value !== 'object' || Array.isArray(value)) {
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

    // A column often holds a number, such as an id or a count; a text value takes it as text.
    if (
      declaration.type === 'string' &&
      (typeof resolved === 'number' || typeof resolved === 'boolean')
    ) {
      resolved = String(resolved);
    }

    const rejection = rejectValue(key, declaration, resolved);
    if (rejection) {
      dropped.push(rejection);
      return;
    }
    if (isEqual(state$.getValue()[key], resolved)) return;
    state$.next({ ...state$.getValue(), [key]: resolved as StateValue });
  };

  return {
    state$,
    openFlyoutId$,
    run: (actions, input = {}) => {
      const dropped: string[] = [];
      const workflows: WorkflowRunRequest[] = [];

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
          case 'runWorkflow': {
            const inputs: Record<string, WorkflowInputValue> = {};
            // One input that cannot be had is reason enough not to run the workflow at all: it would
            // be handed less than it was written to be given.
            const missing = Object.entries(action.inputs).find(([name, source]) => {
              let resolved: unknown;
              if (typeof source !== 'object') {
                resolved = source;
              } else if ('fromColumn' in source) {
                if (!input.row || !(source.fromColumn in input.row)) {
                  dropped.push(`Column "${source.fromColumn}" is not in the row`);
                  return true;
                }
                resolved = input.row[source.fromColumn];
              } else {
                resolved = state$.getValue()[source.fromState];
              }

              const value = toWorkflowInput(resolved);
              if (value === undefined) {
                dropped.push(`The input "${name}" of "${action.workflow}" is not a plain value`);
                return true;
              }
              inputs[name] = value;
              return false;
            });
            if (!missing) workflows.push({ workflow: action.workflow, inputs });
            break;
          }
        }
      });

      return { dropped, workflows };
    },
    restoreView: ({ values, flyout }, keys) => {
      const current = state$.getValue();
      const next = { ...current };
      keys.forEach((key) => {
        const declaration = declarations[key];
        if (!declaration) return;
        const value = values[key];
        next[key] =
          value !== undefined && rejectValue(key, declaration, value) === undefined
            ? value
            : declaration.default;
      });
      if (Object.keys(next).some((key) => !isEqual(next[key], current[key]))) state$.next(next);

      const open = flyout !== undefined && flyoutIds.has(flyout) ? flyout : undefined;
      if (openFlyoutId$.getValue() !== open) openFlyoutId$.next(open);
    },
    setDocument: (next) => {
      declarations = next.state;
      flyoutIds = collectFlyoutIds(next.root);

      const current = state$.getValue();
      const merged = Object.fromEntries(
        Object.entries(declarations).map(([key, declaration]) => [
          key,
          key in current && hasType(current[key], declaration) ? current[key] : declaration.default,
        ])
      );
      const changed =
        Object.keys(merged).length !== Object.keys(current).length ||
        Object.entries(merged).some(([key, value]) => !isEqual(current[key], value));
      if (changed) state$.next(merged);

      const open = openFlyoutId$.getValue();
      if (open !== undefined && !flyoutIds.has(open)) openFlyoutId$.next(undefined);
    },
  };
};
