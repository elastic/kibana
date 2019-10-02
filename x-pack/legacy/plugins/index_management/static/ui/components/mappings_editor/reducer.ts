/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { OnFormUpdateArg } from './shared_imports';
import { Properties, Property } from './types';
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
    data: Properties;
    isValid: boolean | undefined;
  };
}

export type Action =
  | { type: 'configuration.update'; value: OnFormUpdateArg<MappingsConfiguration> }
  | { type: 'property.add'; value: any }
  | { type: 'property.remove'; value: any }
  | { type: 'property.edit'; value: any }
  | { type: 'documentField.createProperty'; value?: string }
  | { type: 'documentField.editProperty'; value: string }
  | { type: 'documentField.changeStatus'; value: DocumentFieldsStatus };

export type Dispatch = (action: Action) => void;

const getChildProperty = (
  property: Property,
  pathsArray: string[]
): { property: Property; childPropertiesName: 'properties' | 'fields' } => {
  const { childPropertiesName } = getPropertyMeta(property);

  if (!Boolean(pathsArray.length)) {
    return { property, childPropertiesName: childPropertiesName! };
  }

  // Clone the "properties" or "fields" object
  property[childPropertiesName!] = {
    ...property[childPropertiesName!],
  };

  // Access the child property at next path
  const childProperty = property[childPropertiesName!]![pathsArray[0]];

  // Recursively access the property
  return getChildProperty(childProperty, pathsArray.slice(1));
};

const getPropertyAtPath = (path: string, properties: Properties) => {
  const pathArray = path.split('.');
  return getChildProperty(properties[pathArray[0]] as Property, pathArray.slice(1));
};

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
      const { name, ...rest } = action.value;
      const { fieldPathToAddProperty } = state.documentFields;

      const updatedPropertiesData = { ...state.properties.data };

      if (fieldPathToAddProperty === undefined) {
        // Adding at the root level
        updatedPropertiesData[name] = rest;
      } else {
        const { property, childPropertiesName } = getPropertyAtPath(
          fieldPathToAddProperty,
          updatedPropertiesData
        );

        property[childPropertiesName] = {
          ...property[childPropertiesName],
          [name]: rest,
        };
      }

      return {
        ...state,
        properties: { ...state.properties, data: updatedPropertiesData },
        documentFields: { ...state.documentFields, status: 'idle' },
      };
    }
    case 'property.edit': {
      const properties = state.properties.data; // Todo update this to merge new prop
      return {
        ...state,
        properties: { ...state.properties, data: properties },
        documentFields: { ...state.documentFields, status: 'idle' },
      };
    }
    default:
      throw new Error(`Action "${action!.type}" not recognized.`);
  }
};
