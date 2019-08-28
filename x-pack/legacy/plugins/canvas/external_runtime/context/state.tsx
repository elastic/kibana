/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  useContext,
  Dispatch,
  useReducer,
  ReactChild,
  RefObject,
} from 'react';
import { CanvasRenderedWorkpad } from '../types';
import { reducer } from './reducer';
import { ExternalEmbedAction } from './actions';

export interface ExternalEmbedState {
  renderersRegistry: {
    register: (fn: Function) => void;
    get: (name: string) => Function;
  } | null;
  workpad: CanvasRenderedWorkpad | null;
  page: number;
  height: number;
  width: number;
  footer: {
    isScrubberVisible: boolean;
  };
  settings: {
    autoplay: {
      enabled: boolean;
      interval: string;
      animate: boolean;
    };
    toolbar: {
      autohide: boolean;
    };
  };
  refs: {
    stage: RefObject<HTMLDivElement>;
  };
}

type StateType = [ExternalEmbedState, Dispatch<ExternalEmbedAction>];

export const initialExternalEmbedState: ExternalEmbedState = {
  renderersRegistry: null,
  workpad: null,
  page: 0,
  height: 0,
  width: 0,
  footer: {
    isScrubberVisible: false,
  },
  settings: {
    autoplay: {
      enabled: false,
      interval: '5s',
      animate: false,
    },
    toolbar: {
      autohide: false,
    },
  },
  refs: {
    stage: React.createRef(),
  },
};

export const ExternalEmbedContext = createContext<StateType>([initialExternalEmbedState, () => {}]);

export const ExternalEmbedStateProvider = ({
  initialState,
  children,
}: {
  initialState: ExternalEmbedState;
  children: ReactChild;
}) => (
  <ExternalEmbedContext.Provider value={useReducer(reducer, initialState)}>
    {children}
  </ExternalEmbedContext.Provider>
);

export const useExternalEmbedState = () => useContext<StateType>(ExternalEmbedContext);
