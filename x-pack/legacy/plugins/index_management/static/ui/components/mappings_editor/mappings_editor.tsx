/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useRef, useCallback } from 'react';

import {
  ConfigurationForm,
  PropertiesProvider,
  DocumentFields,
  DocumentFieldsState,
} from './components';

interface Props {
  setGetDataHandler: (handler: GetMappingsDataHandler) => void;
  onStateUpdate: (state: Partial<State>) => void;
  defaultValue?: Record<string, any>;
}

type GetMappingsDataHandler = () => Promise<{ isValid: boolean; mappings: Mappings }>;
type GetConfigFormDataHandler = () => Promise<{ isValid: boolean; data: Record<string, unknown> }>;

export interface State {
  isValid: boolean;
  isEditingProperty: boolean;
  mappings: Mappings;
}

export type Mappings = Record<string, any>;

const DocumentFieldsMemo = React.memo(DocumentFields);
const ConfigurationFormMemo = React.memo(ConfigurationForm);

export const MappingsEditor = ({ setGetDataHandler, onStateUpdate, defaultValue = {} }: Props) => {
  const properties = useRef<Record<string, unknown>>({});
  const getConfigurationFormData = useRef<GetConfigFormDataHandler>(() =>
    Promise.resolve({ isValid: true, data: defaultValue })
  );

  useEffect(() => {
    setGetDataHandler(async () => {
      const { isValid, data: configFormData } = await getConfigurationFormData.current();
      return { isValid, mappings: { ...configFormData, properties: properties.current } };
    });
  }, []);

  const setGetConfigurationFormDataHandler = useCallback((handler: GetConfigFormDataHandler) => {
    getConfigurationFormData.current = handler;
  }, []);

  const onConfigFormValidityChange = useCallback(
    (isValid: boolean) => onStateUpdate({ isValid }),
    []
  );

  const onDocumentFieldsUpdate = useCallback((docFieldsState: DocumentFieldsState) => {
    properties.current = docFieldsState.properties;

    onStateUpdate({
      isEditingProperty: docFieldsState.isEditing,
    });
  }, []);

  return (
    <div className="mappings-editor">
      {/* Global Mappings configuration */}
      <ConfigurationFormMemo
        setGetDataHandler={setGetConfigurationFormDataHandler}
        onValidityChange={onConfigFormValidityChange}
        defaultValue={defaultValue}
      />

      {/* Document fields */}
      <PropertiesProvider defaultProperties={defaultValue.properties}>
        <DocumentFieldsMemo onUpdate={onDocumentFieldsUpdate} />
      </PropertiesProvider>
    </div>
  );
};
