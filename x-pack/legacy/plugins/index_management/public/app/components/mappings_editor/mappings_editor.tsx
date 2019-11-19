/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { pick } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

import {
  ConfigurationForm,
  CONFIGURATION_FIELDS,
  DocumentFieldsHeaders,
  DocumentFields,
  DocumentFieldsJsonEditor,
} from './components';
import { IndexSettings } from './types';
import { MappingsState, Props as MappingsStateProps, Types } from './mappings_state';
import { IndexSettingsProvider } from './index_settings_context';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

export const MappingsEditor = React.memo(({ onUpdate, defaultValue, indexSettings }: Props) => {
  const configurationDefaultValue = useMemo(
    () =>
      (defaultValue === undefined
        ? {}
        : pick(defaultValue, CONFIGURATION_FIELDS)) as Types['MappingsConfiguration'],
    [defaultValue]
  );

  const fieldsDefaultValue = defaultValue === undefined ? {} : defaultValue.properties;

  return (
    <IndexSettingsProvider indexSettings={indexSettings}>
      <MappingsState onUpdate={onUpdate} defaultValue={{ fields: fieldsDefaultValue }}>
        {({ editor, getProperties }) => {
          const renderEditor = () => {
            if (editor === 'json') {
              return <DocumentFieldsJsonEditor defaultValue={getProperties()} />;
            }
            return <DocumentFields />;
          };

          return (
            <div className="mappingsEditor">
              <ConfigurationForm defaultValue={configurationDefaultValue} />
              <EuiSpacer />
              <DocumentFieldsHeaders />
              <EuiSpacer />
              {renderEditor()}
              {/* <EuiSpacer size={'l'} />
            <EditorToggleControls editor={editor} /> */}
            </div>
          );
        }}
      </MappingsState>
    </IndexSettingsProvider>
  );
});
