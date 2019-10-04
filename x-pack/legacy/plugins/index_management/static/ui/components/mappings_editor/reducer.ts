/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Field, NormalizedFields } from './types';
import { getFieldMeta } from './lib';

export interface MappingsConfiguration {
  dynamic: boolean | string;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
}

export interface MappingsFields {
  [key: string]: any;
}

type DocumentFieldsStatus = 'idle' | 'editingField' | 'creatingField';

export interface State {
  isValid: boolean | undefined;
  configuration: OnFormUpdateArg<MappingsConfiguration>;
  documentFields: {
    status: DocumentFieldsStatus;
    propertyToEdit?: string;
    fieldPathToAddField?: string;
  };
  fields: {
    byId: NormalizedFields['byId'];
    rootLevelFields: NormalizedFields['rootLevelFields'];
    isValid: boolean | undefined;
  };
}

export type Action =
  | { type: 'configuration.update'; value: OnFormUpdateArg<MappingsConfiguration> }
  | { type: 'field.add'; value: Field }
  | { type: 'field.remove'; value: any }
  | { type: 'field.edit'; value: any }
  | { type: 'documentField.createField'; value?: string }
  | { type: 'documentField.editField'; value: string }
  | { type: 'documentField.changeStatus'; value: DocumentFieldsStatus };

export type Dispatch = (action: Action) => void;

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'configuration.update':
      const isValid =
        action.value.isValid === undefined || state.fields.isValid === undefined
          ? undefined
          : action.value.isValid && state.fields.isValid;

      return {
        ...state,
        isValid,
        configuration: action.value,
      };
    case 'documentField.createField':
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          fieldPathToAddField: action.value,
          status: 'creatingField',
        },
      };
    case 'documentField.editField':
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          status: 'editingField',
          propertyToEdit: action.value,
        },
      };
    case 'documentField.changeStatus':
      return { ...state, documentFields: { ...state.documentFields, status: action.value } };
    case 'field.add': {
      const { fieldPathToAddField } = state.documentFields;
      const { name } = action.value;
      const addToRootLevel = fieldPathToAddField === undefined;
      const propertyPath = addToRootLevel ? name : `${fieldPathToAddField}.${name}`;

      const rootLevelFields = addToRootLevel
        ? [...state.fields.rootLevelFields, name]
        : state.fields.rootLevelFields;

      state.fields.byId[propertyPath] = {
        source: action.value,
        ...getFieldMeta(action.value, propertyPath, fieldPathToAddField),
      };

      if (!addToRootLevel) {
        const parentField = state.fields.byId[fieldPathToAddField!];
        const childFields = parentField.childFields || [];

        // Update parent field with new children
        state.fields.byId[fieldPathToAddField!] = {
          ...parentField,
          childFields: [propertyPath, ...childFields],
          hasChildFields: true,
        };
      }

      return {
        ...state,
        fields: { ...state.fields, rootLevelFields },
      };
    }
    case 'field.remove': {
      const { parentPath, path } = state.fields.byId[action.value];
      if (parentPath) {
        // Deleting a child field
        const parentField = state.fields.byId[parentPath];
        parentField.childFields = parentField.childFields!.filter(childPath => childPath !== path);
      } else {
        // Deleting a root level field
        state.fields.rootLevelFields = state.fields.rootLevelFields.filter(
          fieldPath => fieldPath !== path
        );
      }

      delete state.fields.byId[path];
    }
    case 'field.edit': {
      return {
        ...state,
        documentFields: { ...state.documentFields, status: 'idle' },
      };
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
