/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Property, NormalizedProperties } from './types';
import { getPropertyMeta } from './lib';

export interface MappingsConfiguration {
  dynamic: boolean | string;
  date_detection: boolean;
  numeric_detection: boolean;
  dynamic_date_formats: string[];
}

export interface MappingsProperties {
  [key: string]: any;
}

type DocumentFieldsStatus = 'idle' | 'editingProperty' | 'creatingProperty';

export interface State {
  isValid: boolean | undefined;
  configuration: OnFormUpdateArg<MappingsConfiguration>;
  documentFields: {
    status: DocumentFieldsStatus;
    propertyToEdit?: string;
    fieldPathToAddProperty?: string;
  };
  properties: {
    byId: NormalizedProperties['byId'];
    rootLevelFields: NormalizedProperties['rootLevelFields'];
    isValid: boolean | undefined;
  };
}

export type Action =
  | { type: 'configuration.update'; value: OnFormUpdateArg<MappingsConfiguration> }
  | { type: 'property.add'; value: Property }
  | { type: 'property.remove'; value: any }
  | { type: 'property.edit'; value: any }
  | { type: 'documentField.createProperty'; value?: string }
  | { type: 'documentField.editProperty'; value: string }
  | { type: 'documentField.changeStatus'; value: DocumentFieldsStatus };

export type Dispatch = (action: Action) => void;

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'configuration.update':
      const isValid =
        action.value.isValid === undefined || state.properties.isValid === undefined
          ? undefined
          : action.value.isValid && state.properties.isValid;

      return {
        ...state,
        isValid,
        configuration: action.value,
      };
    case 'documentField.createProperty':
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          fieldPathToAddProperty: action.value,
          status: 'creatingProperty',
        },
      };
    case 'documentField.editProperty':
      return {
        ...state,
        documentFields: {
          ...state.documentFields,
          status: 'editingProperty',
          propertyToEdit: action.value,
        },
      };
    case 'documentField.changeStatus':
      return { ...state, documentFields: { ...state.documentFields, status: action.value } };
    case 'property.add': {
      const { fieldPathToAddProperty } = state.documentFields;
      const { name } = action.value;
      const addToRootLevel = fieldPathToAddProperty === undefined;
      const propertyPath = addToRootLevel ? name : `${fieldPathToAddProperty}.${name}`;

      const rootLevelFields = addToRootLevel
        ? [...state.properties.rootLevelFields, name]
        : state.properties.rootLevelFields;

      state.properties.byId[propertyPath] = {
        resource: action.value,
        ...getPropertyMeta(action.value, propertyPath, fieldPathToAddProperty),
      };

      if (!addToRootLevel) {
        const parentProperty = state.properties.byId[fieldPathToAddProperty!];
        const childProperties = parentProperty.childProperties || [];
        // TODO HERE: create a new Set() intead of an empty array?

        // Update parent property with new children
        state.properties.byId[fieldPathToAddProperty!] = {
          ...parentProperty,
          childProperties: [propertyPath, ...childProperties],
          hasChildProperties: true,
        };
      }

      return {
        ...state,
        properties: { ...state.properties, rootLevelFields },
      };
    }
    case 'property.remove': {
      const { parentPath, path } = state.properties.byId[action.value];
      if (parentPath) {
        // Deleting a child property
        const parentProperty = state.properties.byId[parentPath];
        parentProperty.childProperties = parentProperty.childProperties!.filter(
          childPath => childPath !== path
        );
      } else {
        // Deleting a root level field
        state.properties.rootLevelFields = state.properties.rootLevelFields.filter(
          fieldPath => fieldPath !== path
        );
      }

      delete state.properties.byId[path];
    }
    case 'property.edit': {
      return {
        ...state,
        documentFields: { ...state.documentFields, status: 'idle' },
      };
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
