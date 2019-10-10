/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiSpacer } from '@elastic/eui';

import {
  ConfigurationForm,
  CONFIGURATION_FIELDS,
  DocumentFieldsHeaders,
  DocumentFields,
  DocumentFieldsJsonEditor,
  EditorToggleControls,
} from './components';
import { MappingsState, Props as MappingsStateProps, Types } from './mappings_state';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
}

export const MappingsEditor = React.memo(({ onUpdate, defaultValue }: Props) => {
  const configurationDefaultValue = useMemo(
    () =>
      defaultValue === undefined
        ? ({} as Types['MappingsConfiguration'])
        : Object.entries(defaultValue)
            .filter(([key]) => CONFIGURATION_FIELDS.includes(key))
            .reduce(
              (acc, [key, value]) => ({
                ...acc,
                [key]: value,
              }),
              {} as Types['MappingsConfiguration']
            ),
    [defaultValue]
  );
  const fieldsDefaultValue = defaultValue === undefined ? {} : defaultValue.properties;

  return (
    <MappingsState onUpdate={onUpdate} defaultValue={{ fields: fieldsDefaultValue }}>
      {({ editor, getProperties }) => {
        const renderEditor = () => {
          if (editor === 'json') {
            return <DocumentFieldsJsonEditor defaultValue={getProperties()} />;
          }
          return <DocumentFields />;
        };

        return (
          <>
            <ConfigurationForm defaultValue={configurationDefaultValue} />
            <DocumentFieldsHeaders />
            {renderEditor()}
            <EuiSpacer size={'l'} />
            <EditorToggleControls editor={editor} />
          </>
        );
      }}
    </MappingsState>
  );
});
