/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef } from 'react';

import {
  ConfigurationForm,
  PropertiesProvider,
  DocumentFields,
  DocumentFieldsState,
} from './components';

interface Props {
  setGetDataHandler: (
    handler: () => Promise<{ isValid: boolean; data: Record<string, any> }>
  ) => void;
  onStateUpdate: (state: State) => void;
  defaultValue?: Record<string, any>;
}

export interface State {
  isValid: boolean;
  isEditingProperty: boolean;
  properties: Record<string, any>;
}

export type Mappings = Record<string, any>;

type GetFormDataHandler = () => Promise<{ isValid: boolean; data: Record<string, any> }>;

export const MappingsEditor = ({ setGetDataHandler, onStateUpdate, defaultValue = {} }: Props) => {
  const [state, setState] = useState<State>({
    isValid: true,
    isEditingProperty: false,
    properties: {},
  });

  const getConfigurationFormData = useRef<GetFormDataHandler>(() =>
    Promise.resolve({
      isValid: true,
      data: {},
    })
  );

  useEffect(() => {
    setGetDataHandler(async () => {
      const { isValid, data } = await getConfigurationFormData.current();
      return {
        isValid,
        data: { ...data, properties: state.properties },
      };
    });
  }, []);

  useEffect(() => {
    onStateUpdate(state);
  }, [state]);

  const setGetConfigurationFormDataHandler = (handler: GetFormDataHandler) =>
    (getConfigurationFormData.current = handler);

  const onDocumentFieldsUpdate = (docFieldsState: DocumentFieldsState) => {
    setState(prev => ({
      ...prev,
      isEditingProperty: docFieldsState.isEditing,
      properties: docFieldsState.properties,
    }));
  };

  return (
    <div className="mappings-editor">
      {/* Global Mappings configuration */}
      <ConfigurationForm
        setGetDataHandler={setGetConfigurationFormDataHandler}
        onFormValidChange={(isValid: boolean) => setState(prev => ({ ...prev, isValid }))}
        defaultValue={defaultValue}
      />

      {/* Document fields */}
      <PropertiesProvider defaultProperties={defaultValue.properties}>
        <DocumentFields onUpdate={onDocumentFieldsUpdate} />
      </PropertiesProvider>
    </div>
  );
};
