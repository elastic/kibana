/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleActions } from 'redux-actions';
import { State } from '../../../types';
import {
  SetKeyboardShortcutsDocVisibilityType,
  SetKeyboardShortcutsDocVisibilityPayload,
} from '../actions/flyouts';

export const flyoutsReducer = handleActions<
  State['transient'],
  SetKeyboardShortcutsDocVisibilityPayload
>(
  {
    [SetKeyboardShortcutsDocVisibilityType]: (transientState, { payload: isVisible }) => {
      return {
        ...transientState,
        flyouts: {
          ...transientState.flyouts,
          keyboardShortcutsDoc: {
            ...transientState.flyouts.keyboardShortcutsDoc,
            isVisible,
          },
        },
      };
    },
  },
  {} as State['transient']
);
