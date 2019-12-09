/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { produce } from 'immer';
import { Reducer } from 'react';
import { State } from './store';

import { OnHighlightChangeArgs } from '../components/profile_tree';
import { ShardSerialized, Targets } from '../types';

export type Action =
  | { type: 'setProfiling'; value: boolean }
  | { type: 'setHighlightDetails'; value: OnHighlightChangeArgs | null }
  | { type: 'setActiveTab'; value: Targets | null }
  | { type: 'setCurrentResponse'; value: ShardSerialized[] | null };

export const reducer: Reducer<State, Action> = (state, action) =>
  produce<State>(state, draft => {
    if (action.type === 'setProfiling') {
      draft.pristine = false;
      draft.profiling = action.value;
      if (draft.profiling) {
        draft.currentResponse = null;
        draft.highlightDetails = null;
      }
      return;
    }

    if (action.type === 'setHighlightDetails') {
      draft.highlightDetails = action.value;
      return;
    }

    if (action.type === 'setActiveTab') {
      draft.activeTab = action.value;
      return;
    }

    if (action.type === 'setCurrentResponse') {
      draft.currentResponse = action.value;
      if (draft.currentResponse) {
        // Default to the searches tab
        draft.activeTab = 'searches';
      }
      return;
    }

    throw new Error(`Unknown action: ${action}`);
  });
