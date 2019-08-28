/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import produce from 'immer';
import { Action, handleActions } from 'redux-actions';

import { registerShortcut, toggleHelp, unregisterShortcut } from '../actions';
import { HotKey } from '../components/shortcuts';

export interface ShortcutsState {
  showHelp: boolean;
  shortcuts: HotKey[];
}

const helpShortcut: HotKey = {
  key: '?',
  help: 'Display this page',
  modifier: new Map(),
  onPress: dispatch => {
    dispatch(toggleHelp(null));
  },
};

const initialState: ShortcutsState = {
  showHelp: false,
  shortcuts: [helpShortcut],
};

type ShortcutPayload = boolean & null & HotKey;

export const shortcuts = handleActions<ShortcutsState, ShortcutPayload>(
  {
    [String(toggleHelp)]: (state, action: Action<boolean | null>) =>
      produce<ShortcutsState>(state, draft => {
        if (action.payload === null) {
          draft.showHelp = !state.showHelp;
        } else {
          draft.showHelp = action.payload!;
        }
      }),
    [String(registerShortcut)]: (state, action: Action<HotKey>) =>
      produce<ShortcutsState>(state, draft => {
        const hotKey = action.payload as HotKey;
        draft.shortcuts.push(hotKey);
      }),
    [String(unregisterShortcut)]: (state, action: Action<HotKey>) =>
      produce<ShortcutsState>(state, draft => {
        const hotKey = action.payload as HotKey;
        const idx = state.shortcuts.indexOf(hotKey);
        if (idx >= 0) {
          draft.shortcuts.splice(idx, 1);
        }
      }),
  },
  initialState
);
