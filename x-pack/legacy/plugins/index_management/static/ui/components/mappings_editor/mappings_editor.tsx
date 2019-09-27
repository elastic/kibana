/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// import React, { useEffect, useRef, useCallback } from 'react';

// import {
//   ConfigurationForm,
//   PropertiesProvider,
//   DocumentFields,
//   DocumentFieldsState,
// } from './components';

interface Props {
  setGetDataHandler: (handler: GetMappingsDataHandler) => void;
  onStateUpdate: (state: Partial<State>) => void;
  defaultValue?: Record<string, any>;
}

type GetMappingsDataHandler = () => Promise<{ isValid: boolean; mappings: Mappings }>;
// type GetConfigFormDataHandler = () => Promise<{ isValid: boolean; data: Record<string, unknown> }>;

export interface State {
  isValid: boolean;
  isEditingProperty: boolean;
  mappings: Mappings;
}

export type Mappings = Record<string, any>;

export const MappingsEditor = React.memo(
  ({ setGetDataHandler, onStateUpdate, defaultValue = {} }: Props) => {
    // const properties = useRef<Record<string, unknown>>({});
    // const getConfigurationFormData = useRef<GetConfigFormDataHandler>(() =>
    //   Promise.resolve({ isValid: true, data: defaultValue })
    // );

    // useEffect(() => {
    //   setGetDataHandler(async () => {
    //     const { isValid, data: configFormData } = await getConfigurationFormData.current();

    //     return { isValid, mappings: { ...configFormData, properties: properties.current } };
    //   });
    // }, []);

    // const setGetConfigurationFormDataHandler = useCallback((handler: GetConfigFormDataHandler) => {
    //   getConfigurationFormData.current = handler;
    // }, []);

    // const onConfigFormValidityChange = useCallback(
    //   (isValid: boolean) => onStateUpdate({ isValid }),
    //   []
    // );

    // const onDocumentFieldsUpdate = useCallback((docFieldsState: DocumentFieldsState) => {
    //   properties.current = docFieldsState.properties;

    //   onStateUpdate({
    //     isEditingProperty: docFieldsState.isEditing,
    //   });
    // }, []);

    return (
      <div className="mappings-editor">
        {/* Global Mappings configuration */}
        <h2>Global configuration</h2>
        {/* <ConfigurationForm
          setGetDataHandler={setGetConfigurationFormDataHandler}
          onValidityChange={onConfigFormValidityChange}
          defaultValue={defaultValue}
        /> */}

        {/* Document fields */}
        <h2>Document Fields</h2>
        {/* <PropertiesProvider defaultValue={defaultValue.properties}>
          <DocumentFields onUpdate={onDocumentFieldsUpdate} />
        </PropertiesProvider> */}
      </div>
    );
  }
);
