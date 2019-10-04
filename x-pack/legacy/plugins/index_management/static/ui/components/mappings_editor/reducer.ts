/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Field, NormalizedFields, NormalizedField } from './types';
import { getFieldMeta, getUniqueId } from './lib';

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
    fieldToAddFieldTo?: string;
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
          fieldToAddFieldTo: action.value,
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
      const id = getUniqueId();
      const { fieldToAddFieldTo } = state.documentFields;
      const addToRootLevel = fieldToAddFieldTo === undefined;

      const rootLevelFields = addToRootLevel
        ? [...state.fields.rootLevelFields, id]
        : state.fields.rootLevelFields;

      state.fields.byId[id] = {
        id,
        parentId: fieldToAddFieldTo,
        source: action.value,
        ...getFieldMeta(action.value),
      };

      if (!addToRootLevel) {
        const parentField = state.fields.byId[fieldToAddFieldTo!];
        const childFields = parentField.childFields || [];

        // Update parent field with new children
        state.fields.byId[fieldToAddFieldTo!] = {
          ...parentField,
          childFields: [id, ...childFields],
          hasChildFields: true,
        };
      }

      return {
        ...state,
        fields: { ...state.fields, rootLevelFields },
      };
    }
    case 'field.remove': {
      const { id, parentId } = state.fields.byId[action.value];
      let { rootLevelFields } = state.fields;
      if (parentId) {
        // Deleting a child field
        const parentField = state.fields.byId[parentId];
        parentField.childFields = parentField.childFields!.filter(childId => childId !== id);
      } else {
        // Deleting a root level field
        rootLevelFields = rootLevelFields.filter(childId => childId !== id);
      }

      delete state.fields.byId[id];
      return {
        ...state,
        fields: {
          ...state.fields,
          rootLevelFields,
        },
      };
    }
    case 'field.edit': {
      const fieldToEdit = state.documentFields.fieldToEdit!;
      const previousField = state.fields.byId[fieldToEdit!];

      let newField: NormalizedField = {
        ...previousField,
        source: action.value,
      };

      if (newField.source.type !== previousField.source.type) {
        // The field `type` has changed, we need to update its meta information
        // and delete all its children fields.

        newField = {
          ...newField,
          ...getFieldMeta(action.value),
          childFields: undefined,
        };

        if (previousField.childFields) {
          previousField.childFields.forEach(fieldId => {
            delete state.fields.byId[fieldId];
          });
        }
      }

      return {
        ...state,
        fields: {
          ...state.fields,
          byId: {
            ...state.fields.byId,
            [fieldToEdit]: newField,
          },
        },
      };
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
