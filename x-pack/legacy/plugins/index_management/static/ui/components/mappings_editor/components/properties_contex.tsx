/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useReducer, useContext } from 'react';
import { get, set } from 'lodash';

import { unset } from '../helpers';

interface State {
  properties: Record<string, any>;
  selectedPath: string | null;
  selectedObjectToAddProperty: string | null;
}

type Action =
  | { type: 'selectPath'; value: string | null }
  | { type: 'selectObjectToAddProperty'; value: string | null }
  | { type: 'saveProperty'; path: string; value: Record<string, any> }
  | { type: 'deleteProperty'; path: string }
  | { type: 'updatePropertyPath'; oldPath: string; newPath: string };

type Dispatch = (action: Action) => void;

const PropertiesStateContext = React.createContext<State | undefined>(undefined);
const PropertiesDispatchContext = React.createContext<Dispatch | undefined>(undefined);

function propertiesReducer(state: State, action: Action): State {
  let updatedProperties: Record<string, any>;

  switch (action.type) {
    case 'selectPath':
      return { ...state, selectedPath: action.value };
    case 'selectObjectToAddProperty':
      return { ...state, selectedObjectToAddProperty: action.value };
    case 'saveProperty':
      updatedProperties = set({ ...state.properties }, action.path, action.value);
      return {
        ...state,
        selectedPath: null,
        selectedObjectToAddProperty: null,
        properties: updatedProperties,
      };
    case 'deleteProperty':
      updatedProperties = { ...state.properties };
      unset(updatedProperties, action.path);
      return {
        ...state,
        properties: updatedProperties,
      };
    case 'updatePropertyPath':
      const property = get(state.properties, action.oldPath);
      // Delete the property at the old path
      unset(state.properties, action.oldPath);
      // Add it to the new path
      updatedProperties = set({ ...state.properties }, action.newPath, property);
      return {
        ...state,
        properties: updatedProperties,
      };

    default:
      throw new Error(`Unhandled action type: ${action!.type}`);
  }
}

interface Props {
  children: React.ReactNode;
  defaultValue?: Record<string, any>;
}

export const PropertiesProvider = ({ children, defaultValue = {} }: Props) => {
  const [state, dispatch] = useReducer(propertiesReducer, {
    properties: defaultValue,
    selectedPath: null,
    selectedObjectToAddProperty: null,
  });

  return (
    <PropertiesStateContext.Provider value={state}>
      <PropertiesDispatchContext.Provider value={dispatch}>
        {children}
      </PropertiesDispatchContext.Provider>
    </PropertiesStateContext.Provider>
  );
};

export const usePropertiesState = () => {
  const context = useContext(PropertiesStateContext);
  if (context === undefined) {
    throw new Error('usePropertiesState must be used within a <PropertiesProvider />');
  }
  return context;
};

export const usePropertiesDispatch = () => {
  const context = useContext(PropertiesDispatchContext);
  if (context === undefined) {
    throw new Error('usePropertiesState must be used within a <PropertiesProvider />');
  }
  return context;
};
