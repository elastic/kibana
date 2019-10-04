/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Field, NormalizedFields, NormalizedField } from './types';
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
    fieldToEdit?: string;
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
  | { type: 'field.remove'; value: string }
  | { type: 'field.edit'; value: Field }
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
          fieldToEdit: action.value,
        },
      };
    case 'documentField.changeStatus':
      return { ...state, documentFields: { ...state.documentFields, status: action.value } };
    case 'field.add': {
      const { fieldPathToAddField } = state.documentFields;
      const { name } = action.value;
      const addToRootLevel = fieldPathToAddField === undefined;
      const fieldPath = addToRootLevel ? name : `${fieldPathToAddField}.${name}`;

      const rootLevelFields = addToRootLevel
        ? [...state.fields.rootLevelFields, name]
        : state.fields.rootLevelFields;

      state.fields.byId[fieldPath] = {
        source: action.value,
        ...getFieldMeta(action.value, fieldPath, fieldPathToAddField),
      };

      if (!addToRootLevel) {
        const parentField = state.fields.byId[fieldPathToAddField!];
        const childFields = parentField.childFields || [];

        // Update parent field with new children
        state.fields.byId[fieldPathToAddField!] = {
          ...parentField,
          childFields: [fieldPath, ...childFields],
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
      return state;
    }
    case 'field.edit': {
      const fieldToEdit = state.documentFields.fieldToEdit!;
      const previousField = state.fields.byId[fieldToEdit!];
      const { parentPath, source: previousFieldSource } = previousField;

      // As the "name" might have changed, we first calculate the field path that we are editing
      const newFieldPath = parentPath ? `${parentPath}.${action.value.name}` : action.value.name;

      const newField: NormalizedField = {
        source: action.value,
        ...getFieldMeta(action.value, newFieldPath, parentPath),
      };

      // Check if the name has changed
      if (newFieldPath !== fieldToEdit) {
        // The name has changed...
        if (parentPath) {
          // ---> Update the parent `childFields` array
          const parentField = state.fields.byId[parentPath];
          // swap old field path with new one
          parentField.childFields = parentField.childFields!.map(path =>
            path === fieldToEdit ? newFieldPath : path
          );
        } else {
          // ---> Update the root level fields
          state.fields.rootLevelFields = state.fields.rootLevelFields.map(path =>
            path === fieldToEdit ? newFieldPath : path
          );
        }

        // We need to update all the ids of the child fields

        // Make sure to delete the old normalized field
        // delete state.fields.byId[fieldToEdit];
      }

      // Check if the type has changed. If it has we need to delete
      // recursively all child properties
      if (newField.source.type !== previousFieldSource.type) {
        // const allChildFields = getAllChildFields(fieldToEdit, state.fields.byId);
        // debugger;
      }

      state.fields.byId[newFieldPath] = newField;

      return {
        ...state,
        documentFields: { ...state.documentFields, status: 'idle' },
      };
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
