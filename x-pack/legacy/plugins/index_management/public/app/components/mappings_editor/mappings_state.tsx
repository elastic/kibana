/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext, useMemo } from 'react';

import {
  reducer,
  addFieldToState,
  MappingsConfiguration,
  MappingsFields,
  State,
  SourceField,
  Dispatch,
} from './reducer';
import { Field, FieldsEditor } from './types';
import { normalize, deNormalize, canUseMappingsEditor } from './lib';

type Mappings = MappingsConfiguration &
  SourceField & {
    properties: MappingsFields;
  };

export interface Types {
  Mappings: Mappings;
  MappingsConfiguration: MappingsConfiguration;
  MappingsFields: MappingsFields;
  SourceField: SourceField;
}

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: (isValid: boolean) => Mappings;
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
  const { byId, aliases, rootLevelFields, maxNestedDepth } = useMemo(
    () => normalize(defaultValue.fields),
    [defaultValue.fields]
  );

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
    sourceField: {
      data: {
        raw: {},
        format: () => ({} as Mappings),
      },
      validate: () => Promise.resolve(true),
    },
    fields: {
      byId,
      rootLevelFields,
      aliases,
      maxNestedDepth,
    },
    documentFields: {
      status: 'idle',
      editor: canUseDefaultEditor ? 'default' : 'json',
    },
    fieldsJsonEditor: {
      format: () => ({}),
      isValid: true,
    },
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // If we are creating a new field, but haven't entered any name
    // it is valid and we can byPass its form validation (that requires a "name" to be defined)
    const isFieldFormVisible = state.fieldForm !== undefined;
    const emptyNameValue =
      isFieldFormVisible &&
      state.fieldForm!.data.raw.name !== undefined &&
      state.fieldForm!.data.raw.name.trim() === '';

    const bypassFieldFormValidation =
      state.documentFields.status === 'creatingField' && emptyNameValue;

    onUpdate({
      // Output a mappings object from the user's input.
      getData: (isValid: boolean) => {
        let nextState = state;

        if (
          state.documentFields.status === 'creatingField' &&
          isValid &&
          !bypassFieldFormValidation
        ) {
          // If the form field is valid and we are creating a new field that has some data
          // we automatically add the field to our state.
          const fieldFormData = state.fieldForm!.data.format() as Field;
          if (Object.keys(fieldFormData).length !== 0) {
            nextState = addFieldToState(fieldFormData, state);
            dispatch({ type: 'field.add', value: fieldFormData });
          }
        }

        const {
          enabled: dynamicMappingsEnabled,
          throwErrorsForUnmappedFields,
          ...configurationData
        } = nextState.configuration.data.format();

        const dynamicMapping = dynamicMappingsEnabled
          ? true
          : throwErrorsForUnmappedFields
          ? 'strict'
          : false;

        // Pull the mappings properties from the current editor
        const fields =
          nextState.documentFields.editor === 'json'
            ? nextState.fieldsJsonEditor.format()
            : deNormalize(nextState.fields);

        return {
          dynamic: dynamicMapping,
          ...configurationData,
          _source: {
            ...nextState.sourceField.data.format(),
          },
          properties: fields,
        };
      },
      validate: async () => {
        const promisesToValidate = [state.configuration.validate()];

        if (state.fieldForm !== undefined && !bypassFieldFormValidation) {
          promisesToValidate.push(state.fieldForm.validate());
        }

        return Promise.all(promisesToValidate).then(
          validationArray => validationArray.every(Boolean) && state.fieldsJsonEditor.isValid
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

export const useMappingsState = () => {
  const ctx = useContext(StateContext);
  if (ctx === undefined) {
    throw new Error('useMappingsState must be used within a <MappingsState>');
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
