/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext } from 'react';

import { reducer, MappingsConfiguration, MappingsFields, State, Dispatch } from './reducer';
import { Field, FieldsEditor } from './types';
import { normalize, deNormalize, canUseMappingsEditor } from './lib';

type Mappings = MappingsConfiguration & {
  properties: MappingsFields;
};

export interface Types {
  Mappings: Mappings;
  MappingsConfiguration: MappingsConfiguration;
  MappingsFields: MappingsFields;
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
  children: (params: {
    editor: FieldsEditor;
    getProperties(): Mappings['properties'];
  }) => React.ReactNode;
  defaultValue: { fields: { [key: string]: Field } };
  onUpdate: OnUpdateHandler;
}

export const MappingsState = React.memo(({ children, onUpdate, defaultValue }: Props) => {
  const { byId, rootLevelFields, maxNestedDepth } = normalize(defaultValue.fields);

  const canUseDefaultEditor = canUseMappingsEditor(maxNestedDepth);
  const initialState: State = {
    isValid: undefined,
    configuration: {
      data: {
        raw: {},
        format: () => ({} as Mappings),
      },
      validate: () => Promise.resolve(true),
    },
    fields: {
      byId,
      rootLevelFields,
      maxNestedDepth,
    },
    documentFields: {
      status: 'idle',
      editor: canUseDefaultEditor ? 'default' : 'json',
    },
    fieldsJsonEditor: {
      format: () => ({}),
      isValid: undefined,
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // console.log('State update', state);
    onUpdate({
      getData: () => ({
        ...state.configuration.data.format(),
        properties:
          // Pull the mappings properties from the current editor
          state.documentFields.editor === 'json'
            ? state.fieldsJsonEditor.format()
            : deNormalize(state.fields),
      }),
      validate: async () => {
        if (state.fieldForm === undefined) {
          return await state.configuration.validate();
        }

        return Promise.all([state.configuration.validate(), state.fieldForm.validate()]).then(
          ([isConfigurationValid, isFormFieldValid]) => isConfigurationValid && isFormFieldValid
        );
      },
      isValid: state.isValid,
    });
  }, [state]);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children({
          editor: state.documentFields.editor,
          getProperties: () => deNormalize(state.fields),
        })}
      </DispatchContext.Provider>
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
