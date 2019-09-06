/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type ElementActionType =
  | 'CUT'
  | 'COPY'
  | 'PASTE'
  | 'CLONE'
  | 'DELETE'
  | 'BRING_FORWARD'
  | 'BRING_TO_FRONT'
  | 'SEND_BACKWARD'
  | 'SEND_TO_BACK'
  | 'GROUP'
  | 'UNGROUP'
  | 'SHIFT_UP'
  | 'SHIFT_DOWN'
  | 'SHIFT_LEFT'
  | 'SHIFT_RIGHT'
  | 'NUDGE_UP'
  | 'NUDGE_DOWN'
  | 'NUDGE_LEFT'
  | 'NUDGE_RIGHT';

type ExpressionActionType = 'RUN';

type EditorActionType =
  | 'MULTISELECT'
  | 'RESIZE_FROM_CENTER'
  | 'IGNORE_SNAP'
  | 'SELECT_BEHIND'
  | 'UNDO'
  | 'REDO'
  | 'PREV'
  | 'NEXT'
  | 'EDITING'
  | 'GRID'
  | 'REFRESH'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'ZOOM_RESET'
  | 'FULLSCREEN';

type PresentationActionType =
  | 'FULLSCREEN'
  | 'FULLSCREEN_EXIT'
  | 'PREV'
  | 'NEXT'
  | 'REFRESH'
  | 'PAGE_CYCLE_TOGGLE';

export type ElementActions = {
  [key in ElementActionType]: ShortcutMap;
} & { displayName: string };

export type ExpressionActions = {
  [key in ExpressionActionType]: ShortcutMap;
} & { displayName: string };

export type EditorActions = {
  [key in EditorActionType]: ShortcutMap;
} & { displayName: string };

export type PresentationActions = {
  [key in PresentationActionType]: ShortcutMap;
} & { displayName: string };

export type ShortcutActionType =
  | ElementActionType
  | ExpressionActionType
  | EditorActionType
  | PresentationActionType;

export interface ShortcutMap {
  osx: string[];
  windows: string[];
  linux: string[];
  other: string[];
  help: string;
}

export type ShortcutNameSpace = {
  [T in ShortcutActionType]: ShortcutMap;
} & { displayName: string };
