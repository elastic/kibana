/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ConfigurationForm, CONFIGURATION_FIELDS, DocumentFields } from './components';

import {
  MappingsState,
  Props as MappingsStateProps,
  MappingsConfiguration,
} from './mappings_state';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
}

export const MappingsEditor = React.memo(({ onUpdate, defaultValue = {} }: Props) => {
  const configurationDefaultValue = Object.entries(defaultValue)
    .filter(([key]) => CONFIGURATION_FIELDS.includes(key))
    .reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]: value,
      }),
      {} as MappingsConfiguration
    );
  const propertiesDefaultValue = defaultValue.properties || {};

  return (
    <MappingsState onUpdate={onUpdate} defaultValue={{ properties: propertiesDefaultValue }}>
      <ConfigurationForm defaultValue={configurationDefaultValue} />
      <DocumentFields defaultValue={propertiesDefaultValue} />
    </MappingsState>
  );
});
