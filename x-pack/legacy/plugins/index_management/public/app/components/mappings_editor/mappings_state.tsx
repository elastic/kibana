/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useReducer, useEffect, createContext, useContext, useMemo, useRef } from 'react';

import {
  reducer,
  addFieldToState,
  MappingsConfiguration,
  MappingsFields,
  MappingsTemplates,
  State,
  Dispatch,
} from './reducer';
import { Field } from './types';
import { normalize, deNormalize } from './lib';

type Mappings = MappingsTemplates &
  MappingsConfiguration & {
    properties: MappingsFields;
  };

export interface Types {
  Mappings: Mappings;
  MappingsConfiguration: MappingsConfiguration;
  MappingsFields: MappingsFields;
  MappingsTemplates: MappingsTemplates;
}

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: (isValid: boolean) => Mappings | { [key: string]: Mappings };
  validate: () => Promise<boolean>;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

const StateContext = createContext<State | undefined>(undefined);
const DispatchContext = createContext<Dispatch | undefined>(undefined);

export interface Props {
  children: (params: { state: State }) => React.ReactNode;
  defaultValue: {
    templates: MappingsTemplates;
    configuration: MappingsConfiguration;
    fields: { [key: string]: Field };
  };
  onUpdate: OnUpdateHandler;
  mappingsType?: string;
}

export const MappingsState = React.memo(
  ({ children, onUpdate, defaultValue, mappingsType }: Props) => {
    const didMountRef = useRef(false);

    const parsedFieldsDefaultValue = useMemo(() => normalize(defaultValue.fields), [
      defaultValue.fields,
    ]);

    const initialState: State = {
      isValid: undefined,
      configuration: {
        defaultValue: defaultValue.configuration,
        data: {
          raw: defaultValue.configuration,
          format: () => defaultValue.configuration,
        },
        validate: () => Promise.resolve(true),
      },
      templates: {
        defaultValue: defaultValue.templates,
        data: {
          raw: defaultValue.templates,
          format: () => defaultValue.templates,
        },
        validate: () => Promise.resolve(true),
      },
      fields: parsedFieldsDefaultValue,
      documentFields: {
        status: 'idle',
        editor: 'default',
      },
      fieldsJsonEditor: {
        format: () => ({}),
        isValid: true,
      },
      search: {
        term: '',
        result: [],
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

          // Pull the mappings properties from the current editor
          const fields =
            nextState.documentFields.editor === 'json'
              ? nextState.fieldsJsonEditor.format()
              : deNormalize(nextState.fields);

          const configurationData = nextState.configuration.data.format();
          const templatesData = nextState.templates.data.format();

          const mappings = {
            ...configurationData,
            ...templatesData,
            properties: fields,
          };

          return mappingsType === undefined
            ? mappings
            : {
                [mappingsType]: mappings,
              };
        },
        validate: async () => {
          const configurationFormValidator =
            state.configuration.submitForm !== undefined
              ? new Promise(async resolve => {
                  const { isValid } = await state.configuration.submitForm!();
                  resolve(isValid);
                })
              : Promise.resolve(true);

          const templatesFormValidator =
            state.templates.form !== undefined
              ? (await state.templates.form!.submit()).isValid
              : Promise.resolve(true);

          const promisesToValidate = [configurationFormValidator, templatesFormValidator];

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

    useEffect(() => {
      /**
       * If the defaultValue has changed that probably means that we have loaded
       * new data from JSON. We need to update our state with the new mappings.
       */
      if (didMountRef.current) {
        dispatch({
          type: 'editor.replaceMappings',
          value: {
            configuration: defaultValue.configuration,
            templates: defaultValue.templates,
            fields: parsedFieldsDefaultValue,
          },
        });
      } else {
        didMountRef.current = true;
      }
    }, [defaultValue]);

    return (
      <StateContext.Provider value={state}>
        <DispatchContext.Provider value={dispatch}>{children({ state })}</DispatchContext.Provider>
      </StateContext.Provider>
    );
  }
);

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
