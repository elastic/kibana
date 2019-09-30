/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext } from 'react';

import { OnFormUpdateArg } from './shared_imports';

export interface MappingsConfiguration {
  dynamic: boolean | string;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
}

export interface MappingsProperties {
  [key: string]: any;
}

export type Mappings = MappingsConfiguration & {
  properties: MappingsProperties;
};

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: () => Mappings;
  validate: () => Promise<boolean>;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

interface State {
  isValid: boolean | undefined;
  configuration: OnFormUpdateArg<MappingsConfiguration>;
  properties: {
    data: { [key: string]: any };
    status: 'idle' | 'editing' | 'creating';
    isValid: boolean | undefined;
  };
}

type Action =
  | { type: 'updateConfiguration'; value: OnFormUpdateArg<MappingsConfiguration> }
  | { type: 'addProperty'; value: any };

type Dispatch = (action: Action) => void;

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'updateConfiguration':
      const isValid =
        action.value.isValid === undefined || state.properties.isValid === undefined
          ? undefined
          : action.value.isValid && state.properties.isValid;

      return {
        ...state,
        isValid,
        configuration: action.value,
      };
    case 'addProperty':
      return state;
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

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
    data: {},
    status: 'idle',
    isValid: true,
  },
};

export interface Props {
  children: React.ReactNode;
  onUpdate: OnUpdateHandler;
}

export const MappingsState = ({ children, onUpdate }: Props) => {
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
};

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
