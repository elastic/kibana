/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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

type DocumentFieldsStatus = 'idle' | 'editingProperty' | 'creatingProperty';

export interface State {
  isValid: boolean | undefined;
  configuration: OnFormUpdateArg<MappingsConfiguration>;
  documentFields: {
    status: DocumentFieldsStatus;
    propertyToEdit?: string;
  };
  properties: {
    data: { [key: string]: any };
    isValid: boolean | undefined;
  };
}

export type Action =
  | { type: 'configuration.update'; value: OnFormUpdateArg<MappingsConfiguration> }
  | { type: 'property.add'; value: any }
  | { type: 'property.remove'; value: any }
  | { type: 'property.edit'; value: any }
  | { type: 'documentField.createProperty' }
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
      return { ...state, documentFields: { ...state.documentFields, status: 'creatingProperty' } };
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
      const properties = state.properties.data; // Todo update this to merge new prop
      return {
        ...state,
        properties: { ...state.properties, data: properties },
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
