/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, Dispatch, useReducer, ReactChild } from 'react';
import { ExternalEmbedState } from '../types';
import { reducer } from './reducer';
import { ExternalEmbedAction } from './actions';

type StateType = [ExternalEmbedState, Dispatch<ExternalEmbedAction>];

export const initialExternalEmbedState: ExternalEmbedState = {
  renderers: {},
  workpad: null,
  stage: {
    page: 0,
    height: 0,
    width: 0,
  },
  footer: {
    isScrubberVisible: false,
  },
  settings: {
    autoplay: {
      isEnabled: false,
      interval: '5s',
    },
    toolbar: {
      isAutohide: false,
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
