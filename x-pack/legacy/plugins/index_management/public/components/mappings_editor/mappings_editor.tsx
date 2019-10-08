/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';

import {
  ConfigurationForm,
  CONFIGURATION_FIELDS,
  DocumentFieldsHeaders,
  DocumentFields,
} from './components';
import { MappingsState, Props as MappingsStateProps, Types } from './mappings_state';
import { OnUpdateHandler } from '../json_editor/use_json';
import { canUseMappingsEditor } from './lib';
import { JsonEditor } from '../json_editor';

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
      {} as Types['MappingsConfiguration']
    );
  const fieldsDefaultValue = defaultValue.properties || {};

  return (
    <MappingsState onUpdate={onUpdate} defaultValue={{ fields: fieldsDefaultValue }}>
      {({ editor, getProperties, dispatch, maxNestedDepth }) => {
        const [jsonEditorDefault, setJsonEditorDefault] = useState({});
        const onJsonEditorUpdate = useCallback<OnUpdateHandler>(
          args => {
            dispatch({ type: 'jsonEditor.update', value: { json: args.getData() } });
          },
          [dispatch]
        );

        const renderEditor = () => {
          if (editor === 'json') {
            return <JsonEditor onUpdate={onJsonEditorUpdate} defaultValue={jsonEditorDefault} />;
          }
          return <DocumentFields />;
        };

        return (
          <>
            <ConfigurationForm defaultValue={configurationDefaultValue} />
            <DocumentFieldsHeaders />
            {renderEditor()}
            {/* TODO: Review toggle controls below */}
            <EuiSpacer size={'l'} />
            {editor === 'json' ? (
              <EuiButton
                disabled={!canUseMappingsEditor(maxNestedDepth)}
                onClick={() => dispatch({ type: 'changeEditor', value: 'default' })}
              >
                {'Use Mappings Editor'}
              </EuiButton>
            ) : (
              <EuiButton
                onClick={() => {
                  setJsonEditorDefault(getProperties());
                  dispatch({ type: 'changeEditor', value: 'json' });
                }}
              >
                {'Use JSON Editor'}
              </EuiButton>
            )}
          </>
        );
      }}
    </MappingsState>
  );
});
