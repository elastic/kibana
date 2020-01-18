/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'react';
import { produce } from 'immer';

import { createActionFactory } from '../../lib/actions';

export enum UIActions {
  ADD_PANEL = 'ADD_PANEL',
}

export type UIAction = ReturnType<typeof actions[keyof typeof actions]>;

export interface PanelController {
  setWidth: (percent: number) => void;
  getWidth: () => number;
  initialWidth: string;
}

export interface Store {
  panels: PanelController[];
}

const createAction = createActionFactory<UIActions>();

export const addPanel = (panel: PanelController) => createAction(UIActions.ADD_PANEL, { panel });

const actions = {
  addPanel,
};

export const initialState: Store = {
  panels: [],
};

export const reducer: Reducer<Store, UIAction> = (state, action) =>
  produce<Store>(state, draft => {
    switch (action.type) {
      case UIActions.ADD_PANEL: {
        const { panel } = action.payload;
        draft.panels.push(panel);
        return;
      }
    }
  });
