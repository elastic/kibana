/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

// import { OnFormUpdateArg } from './shared_imports';
import {
  ConfigurationForm,
  CONFIGURATION_FIELDS,
  // DocumentFields,
  // DocumentFieldsState,
} from './components';

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

  return (
    <MappingsState onUpdate={onUpdate}>
      <ConfigurationForm defaultValue={configurationDefaultValue} />
      <h2>Document Fields</h2>
    </MappingsState>
  );
});
