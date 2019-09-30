/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext } from 'react';

import { reducer, MappingsConfiguration, MappingsProperties, State, Dispatch } from './reducer';

type Mappings = MappingsConfiguration & {
  properties: MappingsProperties;
};

export interface Types {
  Mappings: Mappings;
  MappingsConfiguration: MappingsConfiguration;
  MappingsProperties: MappingsProperties;
}

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: () => Mappings;
  validate: () => Promise<boolean>;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

export interface Props {
  children: React.ReactNode;
  defaultValue: { properties: { [key: string]: any } };
  onUpdate: OnUpdateHandler;
}

export const MappingsState = React.memo(({ children, onUpdate, defaultValue }: Props) => {
  const initialState: State = {
    isValid: undefined,
    configuration: {
      data: {
        raw: {},
        format: () => ({} as Mappings),
      },
      validate: () => Promise.resolve(false),
    },
    properties: {
      data: defaultValue.properties,
      isValid: true,
    },
    documentFields: {
      status: 'idle',
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);
  useEffect(() => {
    // console.log('State update', state);
    onUpdate({
      getData: () => ({
        ...state.configuration.data.format(),
        properties: state.properties.data,
      }),
      validate: () => {
        return state.configuration.validate();
      },
      isValid: state.isValid,
    });
  }, [state]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
});

export const useState = () => {
  const ctx = useContext(StateContext);
  if (ctx === undefined) {
    throw new Error('useState must be used within a <MappingsState>');
  }
  return ctx;
};

export const useDispatch = () => {
  const ctx = useContext(DispatchContext);
  if (ctx === undefined) {
    throw new Error('useDispatch must be used within a <MappingsState>');
  }
  return ctx;
};
