/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useRef, useCallback } from 'react';

import { OnFormUpdateArg } from './shared_imports';
import {
  ConfigurationForm,
  ConfigurationUpdateHandler,
  MappingsConfiguration,
  // PropertiesProvider,
  // DocumentFields,
  // DocumentFieldsState,
} from './components';

export interface Mappings extends MappingsConfiguration {
  properties: any;
}

export interface OnUpdateHandlerArg {
  isValid?: boolean;
  getData: DataGetterHandler;
  validate: ValidityGetterHandler;
}

export type OnUpdateHandler = (arg: OnUpdateHandlerArg) => void;

export type DataGetterHandler = () => Mappings;
export type ValidityGetterHandler = () => Promise<boolean>;

interface Props {
  onUpdate: OnUpdateHandler;
  defaultValue?: Record<string, any>;
}

export const MappingsEditor = React.memo(({ onUpdate, defaultValue = {} }: Props) => {
  const configurationForm = useRef<OnFormUpdateArg<MappingsConfiguration> | undefined>(undefined);

  const onMappingsDataUpdate = async () => {
    if (configurationForm.current === undefined) {
      return;
    }

    const isMappingsEditorValid = configurationForm.current.isValid; // for now we only check configurationForm

    const getData = (): Mappings => {
      const configurationData = configurationForm.current!.data.format();
      const properties = {};

      return { ...configurationData, properties };
    };

    const validate = async () => {
      const isConfigurationFormValid = await configurationForm.current!.validate();

      return isConfigurationFormValid;
    };

    onUpdate({ isValid: isMappingsEditorValid, getData, validate });
  };

  const onConfigurationFormUpdate = useCallback<ConfigurationUpdateHandler>(data => {
    configurationForm.current = data;

    onMappingsDataUpdate();
  }, []);

  return (
    <div className="mappings-editor">
      {/* Global Mappings configuration */}
      <h2>Global configuration</h2>
      <ConfigurationForm onUpdate={onConfigurationFormUpdate} defaultValue={defaultValue} />

      {/* Document fields */}
      <h2>Document Fields</h2>
      {/* <PropertiesProvider defaultValue={defaultValue.properties}>
          <DocumentFields onUpdate={onDocumentFieldsUpdate} />
        </PropertiesProvider> */}
    </div>
  );
});
