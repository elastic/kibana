/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LayoutDirection } from '@kbn/workflows';
import type { WorkflowEditorView } from '../hooks/use_workflow_url_state';

const storage = new Storage(localStorage);

const EDITOR_VIEW_KEY = 'workflowsUi.editor.view';
const GRAPH_DIRECTION_KEY = 'workflowsUi.graph.direction';
const HIDE_CONTROLS_MENU_KEY = 'workflowsUi.bottomBar.hideControlsMenu';

/** Returns the last-persisted editor view, or `undefined` when unset / invalid. */
export const getStoredEditorView = (): WorkflowEditorView | undefined => {
  const value = storage.get(EDITOR_VIEW_KEY);
  return value === 'graph' || value === 'yaml' ? value : undefined;
};

const editorViewListeners = new Set<() => void>();

/** Calls `listener` whenever the stored editor view is changed from this page; returns the unsubscribe. */
export const subscribeToStoredEditorView = (listener: () => void): (() => void) => {
  editorViewListeners.add(listener);
  return () => {
    editorViewListeners.delete(listener);
  };
};

/** Persists the current editor view to localStorage and tells everyone showing it. */
export const setStoredEditorView = (view: WorkflowEditorView): void => {
  storage.set(EDITOR_VIEW_KEY, view);
  editorViewListeners.forEach((listener) => listener());
};

/** Returns the last-persisted graph direction, or `undefined` when unset / invalid. */
export const getStoredGraphDirection = (): LayoutDirection | undefined => {
  const value = storage.get(GRAPH_DIRECTION_KEY);
  return value === 'LR' || value === 'TB' ? value : undefined;
};

/** Persists the current graph direction to localStorage. */
export const setStoredGraphDirection = (direction: LayoutDirection): void => {
  storage.set(GRAPH_DIRECTION_KEY, direction);
};

/** Returns the last-persisted hide-controls-menu preference, or `undefined` when unset / invalid. */
export const getStoredHideControlsMenu = (): boolean | undefined => {
  const value = storage.get(HIDE_CONTROLS_MENU_KEY);
  return typeof value === 'boolean' ? value : undefined;
};

/** Persists the hide-controls-menu preference to localStorage. */
export const setStoredHideControlsMenu = (hide: boolean): void => {
  storage.set(HIDE_CONTROLS_MENU_KEY, hide);
};
